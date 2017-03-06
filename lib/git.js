'use strict';
var _ = require('lodash');

var Git = function(executor, config, fs) {
    var self = {};
    var debug = require('debug')('jamlen:de:git');
    fs = fs || require('fs');

    function state(repo) {
        debug('checking state of ', repo);
        if (fs.existsSync(repo.path)) {
            executor.queue(null, 'cd ' + repo.path, true);
            executor.queue('Git status for ' + repo.name, 'git status -sb');
        }
    }

    self.statusAll = function(done) {
        _.each(config.allRepos, state);
        executor.execute(done);
    };

    self.status = function(projectName, done) {
        var project = _.filter(config.projects, {
            'name': projectName
        })[0];
        if (project) {
            _.each(project.repos, state);
            executor.execute(done);
        } else {
            done('No project defined with name: ' + projectName);
        }
    };


    function stashList(repo) {
        if (fs.existsSync(repo.path)) {
            executor.queue(null, 'cd ' + repo.path, true);
            executor.queue('Git stash list for ' + repo.name, 'git sl');
        }
    }

    self.stashListAll = function(done) {
        _.each(config.allRepos, stashList);
        executor.execute(done);
    };

    self.stashList = function(projectName, done) {
        var project = _.filter(config.projects, {
            'name': projectName
        })[0];
        if (project) {
            _.each(project.repos, stashList);
            executor.execute(done);
        } else {
            done('No project defined with name: ' + projectName);
        }
    };

    function checkout(repo, branch) {
        if (fs.existsSync(repo.path)) {
            if (!branch) {
                branch = repo.branch;
            }
            executor.queue(null, 'cd ' + repo.path, true);
            executor.queue('Checkout ' + branch + ' branch for ' + repo.name, 'git checkout ' + branch, true);
        }
    }

    self.checkoutAll = function(options, done) {
        _.each(config.allRepos, function(repo) {
            checkout(repo, options.branch);
        });
        executor.execute(done);
        done();
    };

    self.checkout = function(options, done) {
        var project = _.filter(config.projects, {
            'name': options.project
        })[0];
        if (project) {
            _.each(project.repos, function(repo) {
                checkout(repo, options.branch);
            });
            executor.execute(done);
        } else {
            done('No project defined with name: ' + options.project);
        }
    };


    var queue = function(repo) {
        if (!fs.existsSync(repo.path)) {
            executor.queue('Cloning ' + repo.name, 'git clone --depth=1 -q --branch=' + repo.branch + ' "' + repo.url + '" ' + repo.path, true);
            executor.queue(null, 'cd ' + repo.path, true);
            executor.queue(null, 'git config remote.origin.fetch +refs/heads/*:refs/remotes/origin/*', true);
            executor.queue(null, 'git fetch', true);
            // executor.queue(null, 'git checkout master >/dev/null|| git checkout -b master', true);
            // executor.queue(null, 'git flow init -d', true);
            executor.queue(null, 'git checkout ' + repo.branch, true);
        } else {
            executor.queue(null, 'cd ' + repo.path, true);
            // executor.queue(null, 'set +e', true);
            // executor.queue('Stashing changes in ' + repo.name, 'git ss');
            executor.queue('Updating ' + repo.name, 'git pull -q');
            // executor.queue('Applying changes to ' + repo.name, 'git sa');
            // executor.queue(null, 'set -e', true);
        }
    };

    self.pullAll = function(done) {
        _.each(config.allRepos, queue);
        executor.execute(done);
    };

    self.pull = function(projectName, done) {
        var project = _.filter(config.projects, {
            'name': projectName
        })[0];
        if (project) {
            _.each(project.repos, queue);
            executor.execute(done);
        } else {
            done('No project defined with name: ' + projectName);
        }
    };


    return self;
};

module.exports = Git;
