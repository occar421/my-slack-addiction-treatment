# my-slack-addiction-treatment

My personal Slack app modification to prevent the addiction to read new posts.

## What this modification do?

Hide custom sections and channels after the special custom section when it's collapsed. The special custom section should have "[suppressor] suffix (default).

## Requirement

* Deno
* Slack with custom section (paid plan)
    * Should be installed via app. Browser version and Windows Store App version are not supported.

## How to use

### Run Command

```sh
deno run run.ts --slack-dir /path/to/slack/dir --css-url default
```

In Windows, `/path/to/slack/dir` maybe `%LOCALAPPDATA%\slack`. So in PowerShell, it should run.

```powershell
deno run run.ts --slack-dir $env:LOCALAPPDATA\slack --css-url default
```

### Create Special Custom Section named with `[suppressor]` suffix

Like this.

![Show how to change section name in Slack](https://raw.githubusercontent.com/occar421/my-slack-addiction-treatment/main/section-name.png)

### Clear cache and restart Slack if needed

Like this.

![Show how to restart Slack](https://raw.githubusercontent.com/occar421/my-slack-addiction-treatment/main/restart.png)

## CLI Options

### `---slack-dir`

Required. It modifies Slack app in the directory.

### `--css-url`

Required. It injects CSS text fetched from the URL. Default is CSS file in this (root) repository.

## Tips

You can use Dev Tools by running `/slackdevtools` Slack command (like`/remind`).

You can serve local css file with `deno run --allow-read --allow-net https://deno.land/x/serve/mod.ts`.
