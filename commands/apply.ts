import {Command} from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/command.ts";
import * as log from "https://deno.land/std@0.210.0/log/mod.ts";
import {crypto} from "https://deno.land/std@0.210.0/crypto/mod.ts";
import {encodeHex} from "https://deno.land/std@0.210.0/encoding/hex.ts";
import {join} from "https://deno.land/std@0.210.0/path/join.ts";
import asar from "npm:@electron/asar@3.2.10";
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

        const originalResourceHash = await getAsarHeaderHash(paths.resourcePath);

        await injectScript(paths.resourcePath, scriptToInject);

        const modifiedResourceHash = await getAsarHeaderHash(paths.resourcePath);

        console.log(originalResourceHash, modifiedResourceHash);

        logger.info("Done.");
    });

async function backupIfNeeded(paths: Paths) {
    const orders = [
        {name: "resource", original: paths.resourcePath, backup: paths.resourceBackupPath},
        {name: "executable", original: paths.exePath, backup: paths.exeBackupPath},
    ];

    for (const {name, original, backup} of orders) {
        try {
            await Deno.stat(backup);
            logger.debug(`The ${name} backup already exists as "${backup}". Skipped.`);
            // prevent overwrite an original file after the modification

            // Clean file to remove previous injections.
            await Deno.copyFile(backup, original);
        } catch (e) {
            if (e.name === "NotFound") {
                // make a backup
                await Deno.copyFile(original, backup);
                logger.info(`Made a ${name} backup as "${backup}". Skipped.".`);
            }
        }
    }
}

async function injectScript(resourcePath: string, script: string) {
    // Extract resource in asar
    const tmpDir = resourcePath + ".tmp";
    asar.extractAll(resourcePath, tmpDir);
    logger.debug(`Resource is extracted to "${tmpDir}".`);

    // Inject script
    const targetFile = join("dist", "preload.bundle.js");
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

async function getAsarHeaderHash(resourcePath: string) {
    // https://www.electronjs.org/docs/latest/tutorial/asar-integrity#providing-the-header-hash
    // > ASAR integrity validates the contents of the ASAR archive against the header hash that you provide on package time.
    const encoder = new TextEncoder();
    const headerString = asar.getRawHeader(resourcePath).headerString;
    const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(headerString));
    return encodeHex(buffer);
}
