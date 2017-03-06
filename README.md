# de-cli

DevEnv helper CLI


## Getting Started
Install the module with: `npm install -g de-cli` and create a config file named `de-config` 

### `de-config`

`de` will look for the `de-config` in:
1. Current directory
2. Environment variable `DEV_CONFIG`
3. User home directory
4. `/etc/de-cli/`

# Documentation

## Available Commands

Most commands can take a `--all` option, instead of a project which will perform the command against all repos in all projects, except for projects that have `excludeFromAll` specified.

```shell
  Usage: de [options] [command]


  Commands:

    git               Perform git based commands
    npm               Perform npm based commands
    app               Perform app based commands
    test              Perform grunt based commands
    clean             Perform clean up based commands
    setup [options]   Git pull, npm link & install
    help [cmd]        display help for [cmd]

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
```

### `git`
```shell
  Commands:

    pull [options]            Pull configured repos
    status|st [options]       Get the status for all repos
    stash-list|sl [options]   Show stashes for repos
    checkout|co [options]     Checkout [branch] branch for repos
```

### `npm`
```shell
  Commands:

    clean               Clean node_modules
    link [options]      Link configured modules
    install [options]   Install configured repos
    status [options]    Perform npm-check-updates and depcheck on configured repos
```

### `app`
Note that this command currently requires [`forever`](https://www.npmjs.com/package/forever) to start and stop the applications.
```shell
  Commands:

    start [options]   Start configured projects
    stop [options]    Stop configured projects
```

### `test`
```shell
  Commands:

    grunt [options]   Run grunt on the configured projects
```

## Configuration
Configuration can be in either JSON or YAML format. Options available in the config:

### `npmInstalls`
This specifies npm packages to globally install.

### `folder`
This is the folder which all project and module repositories will be checked out to.

### `defaultRepo`
The default base for clone urls. This allows short repo names like `guzzlerio/deride` instead of the full ssh repo url.

### `defaultBranch`
The default branch to checkout. This can be overridden by specifying `@<branch-name>` at the end of the repo url.

### `setupCommands`
This lists the commands that will be executed when `de setup` is invoked.

### `depcheck`
Command line args to pass to [`depcheck`](https://www.npmjs.com/package/depcheck)

### `projects`
The list of projects. Projects also have options that can be changed. `defaultBranch` and `defaultRepo` are available and behave as above.

#### `depends`
Array of projects to depend upon. This ensures projects can be checked out and setup in order to ensure a successful setup.

#### `excludeFromAll`
Exclude this project from any `--all` commands.

#### `repos`
Array of repos. These can be full ssh or https git clone urls, or short user/repo names which will use the `defaultRepo` to build the clone url.

### Example config
An example `de-config` file:

```json
{
    "npmInstalls": ["bower", "nesh", "mversion"],
    "folder": "~/dev/src",
    "defaultRepo": "git@github.com",
    "defaultBranch": "master",
    "setupCommands": ["git pull", "npm link", "npm install"],
    "depcheck": {
      "ignores": "grunt*"
    },
    "projects": [{
        "name": "project1",
        "description": "Node.JS project",
        "depends": ["github"],
        "defaultBranch": "develop",
        "excludeFromAll": false,
        "repos": [
            "jamlen/repo1",
            "jamlen/repo2"
        ]
    }, {
        "name": "github",
        "description": "public github projects",
        "defaultBranch": "develop",
        "excludeFromAll": true,
        "repos": [
            "depcheck/depcheck",
            "https://github.com/tjunnone/npm-check-updates.git"
        ]
    },
    "modules": [
        "guzzlerio/deride@develop"
    ]
}
```

---

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style.

## Release History
_(Nothing yet)_

## License
Copyright &copy;2015 James Allen
Licensed under the MIT license.
