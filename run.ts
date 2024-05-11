import {parseArgs} from "https://deno.land/std@0.210.0/cli/mod.ts";
import * as log from "https://deno.land/std@0.210.0/log/mod.ts";
import {process, recover} from "./logic.ts";

log.setup({
    handlers: {
        console: new log.handlers.ConsoleHandler("DEBUG")
    },
    loggers: {
        default: {
            level: "DEBUG",
            handlers: ["console"]
        }
    }
})

const logger = log.getLogger();

const args = parseArgs(Deno.args);
const isRecovery = args["recovery"];
const slackDir = args["slack-dir"];
let cssBaseUrl_ = args["css-base-url"];

if (!slackDir) {
    logger.error("`--slack-dir` option is required. See README.md next to this file.");
    Deno.exit(160);
}

if (isRecovery) {
    await recover({slackDir});
}

if (!cssBaseUrl_) {
    logger.error("`--css-base-url` option is required. See README.md next to this file.");
    Deno.exit(160);
}

if (cssBaseUrl_ === 'default') {
    cssBaseUrl_ = "https://raw.githubusercontent.com/occar421/my-slack-addiction-treatment/main/";
} else {
    try {
        const url = new URL(cssBaseUrl_);
        cssBaseUrl_ = url.href;
        // deno-lint-ignore no-explicit-any
    } catch (e: any) {
        logger.error(`\`--css-base-url\` with ${e.message}`);
        Deno.exit(160);
    }
}
const cssBaseUrl = cssBaseUrl_;

await process({slackDir, cssBaseUrl});
