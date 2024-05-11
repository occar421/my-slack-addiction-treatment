import {join} from "https://deno.land/std@0.210.0/path/mod.ts";
import {compare, parse, SemVer} from "https://deno.land/std@0.210.0/semver/mod.ts";
import * as log from "https://deno.land/std@0.210.0/log/mod.ts";
import asar from "npm:@electron/asar@3.2.3";

const logger = log.getLogger();

export async function process(options: { slackDir: string, cssBaseUrl: string }) {
    const resourcePath = await getResourcePath(options.slackDir);
    const backupPath = getBackupPath(resourcePath);
    await backupIfNeeded(resourcePath, backupPath);

    const scriptToInject = `
document.addEventListener('DOMContentLoaded', async function() {
    async function generateStyleElement(url) {
      const res = await fetch(url);
      const css = await res.text();
      
      const styleEl = document.createElement('style');
      styleEl.innerHTML = css;
      return styleEl;
    }
    
    document.head.appendChild(await generateStyleElement('${options.cssBaseUrl}/typography.css'));
    document.head.appendChild(await generateStyleElement('${options.cssBaseUrl}/section-util.css'));
});
`;
    await injectScript(resourcePath, scriptToInject);

    logger.info("Done.");
    Deno.exit(0);
}

export async function recover(options: { slackDir: string }) {
    const resourcePath = await getResourcePath(options.slackDir);
    const backupPath = getBackupPath(resourcePath);

    try {
        await Deno.stat(backupPath);
        logger.debug(`Backup already exists as "${backupPath}".`);
        await Deno.copyFile(backupPath, resourcePath);
    } catch (e) {
        if (e.name === "NotFound") {
            logger.error(`No backup for ${resourcePath}.`);
            Deno.exit(160);
        }
        logger.error("Unknown error.");
        Deno.exit(160);
    }

    logger.info(`Recovered from ${backupPath}.`);
    Deno.exit(0);
}

async function getResourcePath(slackDir: string) {
    return join(await pickAppDir(slackDir), "resources", "app.asar");
}

async function pickAppDir(slackDir: string) {
    const regex = /^app-(\d+.\d+(.\d+)?)$/;

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

function getBackupPath(resourcePath: string) {
    return resourcePath + ".backup";
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
