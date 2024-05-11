import {Command} from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/command.ts";
import * as log from "https://deno.land/std@0.210.0/log/mod.ts";
import {join} from "https://deno.land/std@0.210.0/path/join.ts";
import asar from "npm:@electron/asar@3.2.3";
import {ValidationError} from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/_errors.ts";
import {getPaths, Paths} from "../common.ts";

const logger = log.getLogger();

export const applyCommand = new Command<{ slackDir: string }>()
    .description("Apply this modification to Slack app.")
    .option("--css-base-url <url:string>", "Base URL for CSS.", {
        default: "https://raw.githubusercontent.com/occar421/my-slack-addiction-treatment/main/",
        action: ({cssBaseUrl}) => {
            try {
                new URL(cssBaseUrl);
                // deno-lint-ignore no-explicit-any
            } catch (e: any) {
                throw new ValidationError(e.message, {exitCode: 1})
            }
        }
    })
    .action(async ({slackDir, cssBaseUrl}) => {
        const paths = await getPaths(slackDir);

        logger.info(`Use "${paths.latestAppDir}".`);

        await backupIfNeeded(paths);

        const scriptToInject = `
document.addEventListener('DOMContentLoaded', async function() {
    async function generateStyleElement(url) {
      const res = await fetch(url);
      const css = await res.text();
      
      const styleEl = document.createElement('style');
      styleEl.innerHTML = css;
      return styleEl;
    }
    
    document.head.appendChild(await generateStyleElement('${cssBaseUrl}/typography.css'));
    document.head.appendChild(await generateStyleElement('${cssBaseUrl}/section-util.css'));
});
`;
        await injectScript(paths.resourcePath, scriptToInject);

        logger.info("Done.");
    })

async function backupIfNeeded({resourcePath, resourceBackupPath, exePath, exeBackupPath}: Paths) {
    try {
        await Deno.stat(resourceBackupPath);
        logger.debug(`Resource backup already exists as "${resourceBackupPath}". Skipped.`);
        // prevent overwrite an original resource after the modification

        // Clean resource file to remove previous injections.
        await Deno.copyFile(resourceBackupPath, resourcePath);
    } catch (e) {
        if (e.name === "NotFound") {
            // make a backup
            await Deno.copyFile(resourcePath, resourceBackupPath);
            logger.info(`Made a resource backup as "${resourceBackupPath}".`);
        }
    }

    try {
        await Deno.stat(exeBackupPath);
        logger.debug(`.exe backup already exists as "${exeBackupPath}". Skipped.`);
        // prevent overwrite an original .exe after the modification

        // Clean .exe file to remove previous injections.
        await Deno.copyFile(exeBackupPath, exePath);
    } catch (e) {
        if (e.name === "NotFound") {
            // make a backup
            await Deno.copyFile(exePath, exeBackupPath);
            logger.info(`Made a .exe backup as "${exeBackupPath}".`);
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
