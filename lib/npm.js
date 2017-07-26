'use strict';
var _ = require('lodash');
var fs = require('fs');
var path = require('path');

module.exports = function Npm(executor, config) {
    var debug = require('debug')('jamlen:de:npm');
    var self = {};

    function invokeNpm(type, module, action) {
        executor.queue(null, 'cd ' + module.path, true);
        executor.queue(null, type + ' ' + action + ' -q --loglevel=error', true);
    }

    function applyLink(type, moduleNames, repo, packageFile) {
        if (fs.existsSync(path.join(repo.path, packageFile))) {
            var repoConfig = require(path.join(repo.path, packageFile));
            var modules = _.keys(repoConfig.devDependencies).concat(_.keys(repoConfig.dependencies));
            _.forEach(moduleNames, function(moduleName) {
                debug(`LOOKING FOR %s`, moduleName);
                if (_.includes(modules, moduleName)) {
                    debug('APPLYLINK', type, moduleName, repo);
                    executor.queue(null, 'cd ' + repo.path, true);
                    executor.queue(' * Creating ' + type + ' link for ' + moduleName + ' in ' + repo.name, type + ' link -q ' + moduleName + ' --loglevel=error', true);
                }
            });
        }
    }

    function buildLinks(modules, repos, npmUser) {
        _.forEach(modules, function(module) {
            if (fs.existsSync(module.path)) {
                invokeNpm('npm', module, 'link');
                if (fs.existsSync(path.join(module.path), 'bower.json')) {
                    invokeNpm('bower', module, 'link');
                }
                var moduleName = module.name.split('/')[1];
                var moduleNames = [moduleName];
                if (npmUser) {
                    moduleNames.push('@' + npmUser + '/' + moduleName);
                }

                // Now go through all configured repos to find out if we need to link it
                _.each(repos, function(repo) {
                    applyLink('npm', moduleNames, repo, 'package.json');
                    applyLink('bower', moduleNames, repo, 'bower.json');
                });
            }
        });
    }
    self.linkAll = function(done) {
        buildLinks(config.modules, config.allRepos);
        executor.execute(done);
    };

    self.link = function(projectName, done) {
        var project = config.projects[projectName];
        if (!project) {
            done('No project defined with name: ' + projectName);
            return;
        }
        buildLinks(project.modules, project.repos, _.get(project, 'npm.user'));
        executor.execute(done);
    };

    self.installAll = function(done) {
        _.each(config.allProjectRepos, function(repo) {
            if (fs.existsSync(path.join(repo.path, 'package.json'))) {
                invokeNpm('npm', repo, 'install');
                if (fs.existsSync(path.join(repo.path, 'bower.json'))) {
                    invokeNpm('bower', repo, 'install');
                }
            }
        });
        executor.execute(done);
    };

    self.install = function(projectName, done) {
        var project = config.projects[projectName];
        if (!project) {
            done('No project defined with name: ' + projectName);
            return;
        }
        _.each(project.repos, function(repo) {
            if (fs.existsSync(path.join(repo.path, 'package.json'))) {
                invokeNpm('npm', repo, 'install');
                if (fs.existsSync(path.join(repo.path, 'bower.json'))) {
                    invokeNpm('bower', repo, 'install');
                }
            }
        });
        executor.execute(done);
    };

    function buildCmdArgs() {
        var result = [];
        _.forOwn(config.depcheck, function (value, name) {
            result.push('--' + name + '=' + value);
        });
        debug('depcheck args', result);
        return result.join(' ');
    }
    function status (repo, done) {
        if (fs.existsSync(path.resolve(repo.path, 'package.json'))) {
            executor.queue(null, 'cd ' + repo.path, true);
            executor.queue('NPM Status for: ' + repo.name, '');
            executor.queue('Available Updates', path.resolve(__dirname, '..', 'node_modules', '.bin', 'ncu') + ' --packageFile ' + path.resolve(repo.path, 'package.json'));
            executor.queue('Checking for unused dependencies', path.resolve(__dirname, '..', 'node_modules', '.bin', 'depcheck') + ' ' + buildCmdArgs(), false, true);
        }
    }
    self.status = function (opts, done) {
        executor.queue(null, 'echo "\n ====> Project Repos"');
        _.each(config.projects[opts].repos, status);
        executor.queue(null, 'echo "\n ====> Project Modules"');
        _.each(config.projects[opts].modules, status);
        executor.execute(done);
    };

    self.statusAll = function(done) {
        _.each(config.allRepos, function(repo) {
            status(repo, done);
        });
        executor.execute(done);
    };

    return self;
};

