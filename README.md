# my-slack-addiction-treatment

My personal Slack app modification to prevent the addiction to read new posts.

## Requirement

* Deno
* Slack with custom section (paid plan)
    * Should be installed via app. Browser version and Windows Store App version are not supported.

## How to use

### Run Command

```sh
deno run --allow-read=/path/to/slack/dir,./ --allow-write=/path/to/slack/dir run.ts --slack-dir /path/to/slack/dir
```

In Windows, `/path/to/slack/dir` maybe `%LOCALAPPDATA%\slack`. So in PowerShell, it should run.

```powershell
deno run --allow-read = $env:LOCALAPPDATA\slack, ./ --allow-write = $env:LOCALAPPDATA\slack run.ts --slack-dir $env:LOCALAPPDATA\slack
```

### Create Custom Section with `[suppressor]` suffix

Like this.

![Show how to change section name in Slack](https://raw.githubusercontent.com/occar421/my-slack-addiction-treatment/main/section-name.png)

### Clear cache and restart Slack if needed

Like this.

![Show how to restart Slack](https://raw.githubusercontent.com/occar421/my-slack-addiction-treatment/main/restart.png)

## CLI Options

### `---slack-dir`

Required. It modifies Slack app in the directory.

### `--css-url`

Optional. It injects CSS text fetched from the URL. Default is CSS file in this (root) repository.

## Tips

You can use Dev Tools by running `/slackdevtools` Slack command (like`/remind`).
