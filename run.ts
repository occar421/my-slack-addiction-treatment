import {parseArgs} from "https://deno.land/std@0.210.0/cli/mod.ts";
import {join} from "https://deno.land/std@0.210.0/path/mod.ts";
import {compare, parse, SemVer} from "https://deno.land/std@0.210.0/semver/mod.ts";
import * as log from "https://deno.land/std@0.210.0/log/mod.ts";
import asar from "npm:@electron/asar@3.2.3";

log.setup({
    handlers: {
        console: new log.handlers.ConsoleHandler("DEBUG")
    },
    loggers: {
        default: {
            level: "DEBUG",
            handlers: ["console"]
        }
    }
})

const logger = log.getLogger();

const args = parseArgs(Deno.args);
const slackDir = args["slack-dir"];
let cssUrl_ = args["css-url"];

if (!slackDir) {
    logger.error("`--slack-dir` option is required. See README.md next to this file.");
    Deno.exit(160);
}

if (!cssUrl_) {
    logger.error("`--css-url` option is required. See README.md next to this file.");
    Deno.exit(160);
}

if (cssUrl_ === 'default') {
    cssUrl_ = "https://raw.githubusercontent.com/occar421/my-slack-addiction-treatment/main/style.css";
} else {
    try {
        const url = new URL(cssUrl_);
        cssUrl_ = url.href;
        // deno-lint-ignore no-explicit-any
    } catch (e: any) {
        logger.error(`\`--css-url\` with ${e.message}`);
        Deno.exit(160);
    }
}
const cssUrl = cssUrl_;

await process({slackDir, cssUrl});

async function process(options: { slackDir: string, cssUrl: string }) {
    const resourcePath = join(await pickAppDir(options.slackDir), "resources", "app.asar");

    const backupPath = resourcePath + ".backup";
    await backupIfNeeded(resourcePath, backupPath);

    const scriptToInject = `
document.addEventListener('DOMContentLoaded', async function() {
     const cssUrl = '${options.cssUrl}';
     const res = await fetch(cssUrl);
     const css = await res.text();
     
     const styleEl = document.createElement('style');
     styleEl.type = 'text/css';
     styleEl.innerHTML = css; 
     document.head.appendChild(styleEl);
   });
`;
    await injectScript(resourcePath, scriptToInject);

    logger.info("Done.");
}

async function pickAppDir(slackDir: string) {
    const regex = /app-(\d+.\d+(.\d+)?)/;

    const versions: [string, SemVer][] = [];
    for await (const entry of Deno.readDir(slackDir)) {
        if (entry.isDirectory) {
            const match = regex.exec(entry.name);
            if (match) {
                versions.push([match[1], parse(match[1])]);
            }
        }
    }

    versions.sort((v1, v2) => compare(v1[1], v2[1]));
    const version = versions.pop()!;
    const appName = `app-${version[0]}`;
    logger.info(`Use "${appName}".`);

    return join(slackDir, appName);
}

async function backupIfNeeded(resourcePath: string, backupPath: string) {
    try {
        await Deno.stat(backupPath);
        logger.debug(`Backup already exists as "${backupPath}". Skipped.`);
        // prevent overwrite an original resource after the modification

        // Clean resource file to remove previous injections.
        await Deno.copyFile(backupPath, resourcePath);
    } catch (e) {
        if (e.name === "NotFound") {
            // make a backup
            await Deno.copyFile(resourcePath, backupPath);
            logger.info(`Made a backup as "${backupPath}".`);
        }
    }
}

async function injectScript(resourcePath: string, script: string) {
    // Extract resource in asar
    const tmpDir = resourcePath + ".tmp";
    await asar.extractAll(resourcePath, tmpDir);
    logger.debug(`Resource is extracted to "${tmpDir}".`);

    // Inject script
    const targetFile = "dist/preload.bundle.js";
    const targetFilePath = join(tmpDir, targetFile);
    const content = await Deno.readTextFile(targetFilePath);
    const modifiedContent = `${content}
${script}
`;
    await Deno.writeTextFile(targetFilePath, modifiedContent);
    logger.debug("Injected script.");

    // Pack modified resources
    await asar.createPackage(tmpDir, resourcePath);
    logger.debug("Resource is re-packed.");
}
