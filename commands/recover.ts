import {Command} from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/command.ts";
import * as log from "https://deno.land/std@0.210.0/log/mod.ts";
import {getPaths} from "../common.ts";

const logger = log.getLogger();

export const recoverCommand = new Command<{ slackDir: string }>()
    .description("Recover from backup file.")
    .action(async ({slackDir}) => {
        const {latestAppDir, resourcePath, resourceBackupPath, exePath, exeBackupPath} = await getPaths(slackDir);

        logger.info(`Use "${latestAppDir}".`);

        try {
            await Deno.stat(resourceBackupPath);
            logger.debug(`Resource backup exists as "${resourceBackupPath}".`);
            await Deno.copyFile(resourceBackupPath, resourcePath);
        } catch (e) {
            if (e.name === "NotFound") {
                logger.error(`No backup for ${resourcePath}.`);
                Deno.exit(160);
            }
            logger.error("Unknown error.");
            Deno.exit(160);
        }

        try {
            await Deno.stat(exeBackupPath);
            logger.debug(`.exe backup exists as "${exeBackupPath}".`);
            await Deno.copyFile(exeBackupPath, exePath);
        } catch (e) {
            if (e.name === "NotFound") {
                logger.error(`No backup for ${exePath}.`);
                Deno.exit(160);
            }
            logger.error("Unknown error.");
            Deno.exit(160);
        }

        logger.info(`Recovered from ${resourceBackupPath} and ${exeBackupPath}.`);
    })
