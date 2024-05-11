import {join} from "https://deno.land/std@0.210.0/path/mod.ts";
import {compare, parse, SemVer} from "https://deno.land/std@0.210.0/semver/mod.ts";
import * as log from "https://deno.land/std@0.210.0/log/mod.ts";

const logger = log.getLogger();

export async function getResourcePath(slackDir: string) {
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

export function getBackupPath(resourcePath: string) {
    return resourcePath + ".backup";
}
