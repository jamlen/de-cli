'use strict';
var _ = require('lodash');
var Path = require('path');
var ConfigParser = require('./configParser');
var Executor = require('./executor');
var Git = require('./git');
var Npm = require('./npm');
var App = require('./app');
var Test = require('./test');
var Cleaner = require('./clean');

var fs = require('fs');
var os = require('os');

var config = new ConfigParser();

var configPath;
if (fs.existsSync(Path.join(process.cwd(), 'de-config'))) {
    configPath = Path.join(process.cwd(), 'de-config');
} else if (process.env.DEV_CONFIG && fs.existsSync(process.env.DEV_CONFIG)) {
    configPath = process.env.DEV_CONFIG;
} else if (fs.existsSync(Path.join(os.homedir(), 'de-config'))) {
    configPath = Path.join(os.homedir(), 'de-config');
} else if (fs.existsSync('/etc/de-cli/de-config')) {
    configPath = '/etc/de-cli/de-config';
} else {
    console.error('ERROR: de-config wasnt found in any of the expected locations!  Please set DEV_CONFIG env variable');
    process.exit(-1);
}

config.parse(configPath);
var executor = new Executor();
var git = new Git(executor, config);
var npm = new Npm(executor, config);
var app = new App(executor, config);
var test = new Test(executor, config);
var clean = new Cleaner(executor, config);

module.exports = {
    config: config,
    executor: executor,
    git: git,
    npm: npm,
    app: app,
    clean: clean,
    test: test,
    setup: function(options, cb) {
        if (options.clean) {
            executor.queue('Cleaning first', 'de clean all', true);
        }
        var commands = _.map(config.setupCommands, function(cmd) {
            return 'de ' + cmd + ' --all';
        });
        var globalNpmInstalls = null;
        var npmInstalls = _.result(config, 'npmInstalls', []);
        if (_.some(npmInstalls)) {
            globalNpmInstalls = 'npm install --global ' + npmInstalls.join(' ');
            commands.unshift(globalNpmInstalls);
        }
        console.log(commands.join(' && '));
        executor.queue('Setting up environment', commands.join(' && '), true);
        executor.execute(cb);
    },
    done: function(err, response) {
        if (err) {
            console.error(' !! ' + err);
        }
        if (response && response.code !== 0) {
            console.error('Command did not complete successfully', response);
            return;
        }
        console.log('Done!');
    }
};
