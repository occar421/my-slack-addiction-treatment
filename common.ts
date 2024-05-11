import {join} from "https://deno.land/std@0.210.0/path/mod.ts";
import {compare, parse, SemVer} from "https://deno.land/std@0.210.0/semver/mod.ts";

export async function getPaths(slackDir: string) {
    const latestAppDir = await pickLatestAppDir(slackDir);
    const resourcePath = join(latestAppDir, "resources", "app.asar");
    const exePath = join(latestAppDir, "slack.exe");

    const resourceBackupPath = `${resourcePath}.backup`;
    const exeBackupPath = `${exePath}.backup`;

    return {
        latestAppDir,
        resourcePath,
        exePath,
        resourceBackupPath,
        exeBackupPath,
    }
}

export type Paths = Awaited<ReturnType<typeof getPaths>>;

async function pickLatestAppDir(slackDir: string) {
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

    return join(slackDir, appName);
}
