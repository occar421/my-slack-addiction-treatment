import {join} from "https://deno.land/std@0.130.0/path/mod.ts";
import {compare} from "https://deno.land/std@0.182.0/semver/mod.ts";
import asar from "npm:@electron/asar@3.2.3";

const slackDir = join(Deno.env.get("LOCALAPPDATA"), "./slack");

//
// Pick up Slack app directory
//
const appDirRegex = /app-(\d+.\d+(.\d+)?)/;

const appVersions = [];
for await (const entry of Deno.readDir(slackDir)) {
    if (entry.isDirectory) {
        const match = appDirRegex.exec(entry.name);
        if (match) {
            appVersions.push(match[1]);
        }
    }
}

appVersions.sort(compare);
const slackAppVersion = appVersions.pop();

const slackAppResource = join(slackDir, `app-${slackAppVersion}`, "resources", "app.asar");
console.info(`Use "${slackAppResource}".`);


//
// Backup
//
const slackAppResourceBackup = slackAppResource + ".backup";
try {
    await Deno.stat(slackAppResourceBackup);
    console.debug(`Backup already exists as "${slackAppResourceBackup}". Skipped.`);
    // prevent overwrite an original resource after the modification
} catch (e) {
    if (e.name === "NotFound") {
        // make a backup
        await Deno.copyFile(slackAppResource, slackAppResourceBackup);
        console.info(`Made a backup as "${slackAppResourceBackup}".`);
    }
}


//
// Extract resource in asar
//
const slackAppResourceTmpDir = slackAppResource + ".tmp";
await asar.extractAll(slackAppResource, slackAppResourceTmpDir);
console.debug(`Resource is extracted to "${slackAppResourceTmpDir}".`);


//
// Inject script
//
const targetScript = "dist/preload.bundle.js";
const cssUrl = "https://raw.githubusercontent.com/occar421/my-slack-addiction-treatment/main/style.css";
const injectionTargetScriptPath = join(slackAppResourceTmpDir, targetScript);
const content = await Deno.readTextFile(injectionTargetScriptPath);
const modifiedContent = `${content}
document.addEventListener('DOMContentLoaded', async function() {
     const cssPath = "${cssUrl}";
     const res = await fetch(cssPath);
     const css = await res.text();
     
     const styleEl = document.createElement('style');
     styleEl.type = 'text/css';
     styleEl.innerHTML = css; 
     document.head.appendChild(styleEl);
   });
`;
await Deno.writeTextFile(injectionTargetScriptPath, modifiedContent);
console.debug("Injected script.");


//
// Pack modified resources
//
await asar.createPackage(slackAppResourceTmpDir, slackAppResource);
console.debug("Resource is re-packed.");
