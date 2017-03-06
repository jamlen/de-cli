'use strict';
var _ = require('lodash');
var fs = require('fs');
var exec = require('sync-exec');

var App = function(executor, config) {
    var self = {};
    var r = new RegExp(/^data\:\s{4}\[/);
    var logRoot = '/var/log/forever';

    function isRunning(repo) {
        exec('forever columns set uid');
        var processes = exec('forever list --plain | grep "^\ndata\:"').stdout.split('\n');
        return _.chain(processes)
            .filter(function(x) {
                return r.test(x);
            })
            .map(function(x) {
                return x.substr(13).trim();
            })
            .any(function(x) {
                return x === repo.name.split('/')[1];
            })
            .value();
    }

    var forever = {
        start: function start(repo) {
            if (isRunning(repo)) {
                console.log(repo.name.split('/')[1] + ' already started');
                return;
            }
            if (fs.existsSync(repo.path)) {
                var cmd = null;
                var pkg = require(repo.path + '/package.json');
                if (_.has(pkg, 'scripts.start') || fs.existsSync(repo.path + '/app.js')) {
                    cmd = _.has(pkg, 'scripts.start') ? 'npm start' : repo.path + '/app.js';
                    executor.queue(null, 'sudo mkdir -p ' + logRoot, true);
                    executor.queue(null, 'sudo chown -R docker:docker ' + logRoot, true);
                    var logFile = logRoot + '/' + repo.name.split('/')[1];
                    executor.queue(null, 'cd ' + repo.path, true);
                    executor.queue('Starting ' + repo.name, 'ENV=local forever start --killTree -l ' + logFile + '.forever.log -a -o ' + logFile + '.out.log -e ' + logFile + '.error.log --minUptime 1000 --spinSleepTime 100 --uid "' + repo.name.split('/')[1] + '" ' + repo.path + ' ' + cmd);
                }
            }
        },
        stop: function stop(repo) {
            if (fs.existsSync(repo.path) && fs.existsSync(repo.path + '/app.js')) {
                if (isRunning(repo)) {
                    executor.queue(null, 'cd ' + repo.path, true);
                    executor.queue('Stopping ' + repo.name, 'forever stop ' + repo.name.split('/')[1]);
                }
            }
        }
    };

    _.each(['start', 'stop'], function(method) {
        self[method + 'All'] = function(done) {
            _.each(config.allProjectRepos, forever[method]);
            executor.execute(done);
        };

        self[method] = function(projectName, done) {
            var project = _.find(config.projects, {
                'name': projectName
            });
            if (project) {
                _.each(project.repos, forever[method]);
                executor.execute(done);
            } else {
                done('No project defined with name: ' + projectName);
            }
        };
    });

    return self;
};

module.exports = App;
