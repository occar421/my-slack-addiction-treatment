import {Command} from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/command.ts";
import * as log from "https://deno.land/std@0.210.0/log/mod.ts";
import {getBackupPath, getResourcePath} from "../common.ts";

const logger = log.getLogger();

export const recoverCommand = new Command<{ slackDir: string }>()
    .description("Recover from backup file.")
    .action(async ({slackDir}) => {
        const resourcePath = await getResourcePath(slackDir);
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
    })
