'use strict';
var _ = require('lodash');
var fs = require('fs');
var path = require('path');

module.exports = function Npm(executor, config) {
    var debug = require('debug')('jamlen:de:npm');
    var self = {};

    function createLink(type, module, action) {
        executor.queue(null, 'cd ' + module.path, true);
        executor.queue(type + ' ' + action + ' for ' + module.name, type + ' ' + action + ' -q --loglevel=error', true);
    }

    function applyLink(type, moduleName, repo, packageFile) {
        if (fs.existsSync(path.join(repo.path, packageFile))) {
            var repoConfig = require(path.join(repo.path, packageFile));
            var modules = _.keys(repoConfig.devDependencies).concat(_.keys(repoConfig.dependencies));
            if (_.contains(modules, moduleName)) {
                executor.queue(null, 'cd ' + repo.path, true);
                executor.queue(' * Creating ' + type + ' link for ' + moduleName + ' in ' + repo.name, type + ' link -q ' + moduleName + ' --loglevel=error', true);
            }
        }
    }

    self.linkAll = function(done) {
        _.each(config.modules, function(module) {
            if (fs.existsSync(module.path)) {
                createLink('npm', module, 'link');
                if (fs.existsSync(path.join(module.path), 'bower.json')) {
                    createLink('bower', module, 'link');
                }
                var moduleName = module.name.split('/')[1];

                // Now go through all configured repos to find out if we need to link it
                _.each(config.allRepos, function(repo) {
                    applyLink('npm', moduleName, repo, 'package.json');
                    applyLink('bower', moduleName, repo, 'bower.json');
                });
            }
        });
        executor.execute(done);
    };

    self.installAll = function(done) {
        _.each(config.allProjectRepos, function(repo) {
            if (fs.existsSync(repo.path)) {
                createLink('npm', repo, 'install');
                if (fs.existsSync(path.join(repo.path, 'bower.json'))) {
                    createLink('bower', repo, 'install');
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
        _.each(config.projects[opts].repos, function(repo) {
            status(repo, done);
        });
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

