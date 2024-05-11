import {Command} from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/command.ts";
import * as log from "https://deno.land/std@0.210.0/log/mod.ts";
import {getPaths} from "../common.ts";

const logger = log.getLogger();

export const recoverCommand = new Command<{ slackDir: string }>()
    .description("Recover from backup file.")
    .action(async ({slackDir}) => {
        const paths = await getPaths(slackDir);

        logger.info(`Use "${paths.latestAppDir}".`);

        const orders = [
            {name: "resource", original: paths.resourcePath, backup: paths.resourceBackupPath},
            {name: "executable", original: paths.exePath, backup: paths.exeBackupPath},
        ];

        for (const {name, original, backup} of orders) {
            try {
                await Deno.stat(backup);
                logger.debug(`The ${name} backup exists as "${backup}".`);
                await Deno.copyFile(backup, original);
            } catch (e) {
                if (e.name === "NotFound") {
                    logger.error(`No ${name} backup for ${original}.`);
                    Deno.exit(160);
                }
                logger.error("Unknown error.");
                Deno.exit(160);
            }
        }

        logger.info(`Recovered from ${paths.resourceBackupPath} and ${paths.exeBackupPath}.`);
    })
