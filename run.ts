import * as log from "https://deno.land/std@0.210.0/log/mod.ts";
import {join} from "https://deno.land/std@0.210.0/path/join.ts";
import {Command, ValidationError} from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/mod.ts";
import {applyCommand} from "./commands/apply.ts";
import {recoverCommand} from "./commands/recover.ts";

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
});

await new Command()
    .globalOption("--slack-dir <string>", "Target Slack app directory.", {
        default: () => {
            if (Deno.build.os !== "windows") {
                throw new Error(`Not supported on ${Deno.build.os}.`);
            }

            const localappdata = Deno.env.get("LOCALAPPDATA");
            if (!localappdata) {
                throw new ValidationError(`Unable to locate Slack app directory.`);
            }
            return join(localappdata, "slack")
        }
    })
    .action(function () {
        this.showHelp();
    })
    .command("apply", applyCommand)
    .command("recover", recoverCommand)
    .parse(Deno.args);
