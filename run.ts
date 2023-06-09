import {parse} from "https://deno.land/std@0.66.0/flags/mod.ts";
import {join} from "https://deno.land/std@0.130.0/path/mod.ts";
import {compare} from "https://deno.land/std@0.182.0/semver/mod.ts";
import asar from "npm:@electron/asar@3.2.3";

const args = parse(Deno.args);
const slackDir = args["slack-dir"];
const cssUrl = args["css-url"] ?? "https://raw.githubusercontent.com/occar421/my-slack-addiction-treatment/main/style.css";

if (!slackDir) {
    console.error("`--slack-dir` option is required. See README.md next to this file.");
    Deno.exit(160);
}

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

    console.info("Done.");
}

async function pickAppDir(slackDir: string) {
    const regex = /app-(\d+.\d+(.\d+)?)/;

    const versions = [];
    for await (const entry of Deno.readDir(slackDir)) {
        if (entry.isDirectory) {
            const match = regex.exec(entry.name);
            if (match) {
                versions.push(match[1]);
            }
        }
    }

    versions.sort(compare);
    const version = versions.pop();
    const appName = `app-${version}`;
    console.info(`Use "${appName}".`);

    return join(slackDir, appName);
}

async function backupIfNeeded(resourcePath: string, backupPath: string) {
    try {
        await Deno.stat(backupPath);
        console.debug(`Backup already exists as "${backupPath}". Skipped.`);
        // prevent overwrite an original resource after the modification

        // Clean resource file to remove previous injections.
        await Deno.copyFile(backupPath, resourcePath);
    } catch (e) {
        if (e.name === "NotFound") {
            // make a backup
            await Deno.copyFile(resourcePath, backupPath);
            console.info(`Made a backup as "${backupPath}".`);
        }
    }
}

async function injectScript(resourcePath: string, script: string) {
    // Extract resource in asar
    const tmpDir = resourcePath + ".tmp";
    await asar.extractAll(resourcePath, tmpDir);
    console.debug(`Resource is extracted to "${tmpDir}".`);

    // Inject script
    const targetFile = "dist/preload.bundle.js";
    const targetFilePath = join(tmpDir, targetFile);
    const content = await Deno.readTextFile(targetFilePath);
    const modifiedContent = `${content}
${script}
`;
    await Deno.writeTextFile(targetFilePath, modifiedContent);
    console.debug("Injected script.");

    // Pack modified resources
    await asar.createPackage(tmpDir, resourcePath);
    console.debug("Resource is re-packed.");
}
