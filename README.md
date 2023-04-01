# my-slack-addiction-treatment

My personal Slack app modification to prevent the addiction to read new posts.

## Requirement

* Deno
* Slack with custom section (paid plan)

## How to use

### Run Command

```sh
deno run --allow-read=/path/to/slack/dir,./ --allow-write=/path/to/slack/dir run.ts --slack-dir /path/to/slack/dir
```

In Windows, `/path/to/slack/dir` maybe `%LOCALAPPDATA%\slack`. So in PowerShell, it should run.

```powershell
deno run --allow-read =$env:LOCALAPPDATA\slack, ./ --allow-write =$env:LOCALAPPDATA\slack run.ts --slack-dir $env:LOCALAPPDATA\slack
```

### Create Custom Section with `[suppressor]` suffix

Like this ![img.png](https://raw.githubusercontent.com/occar421/my-slack-addiction-treatment/main/section-name.png).
