'use strict';
var _ = require('lodash');
var fs = require('fs');

var Grunt = function(executor, config) {
    var self = {};

    function queue(repo) {
        if (fs.existsSync(repo.path)) {
            executor.queue(null, 'cd ' + repo.path, true);
            executor.queue('Grunting ' + repo.path, 'grunt', false, true);
        }
    }

    self.gruntAll = function(done) {
        _.each(config.allRepos, queue);
        executor.execute(done);
    };

    self.grunt = function(projectName, done) {
        var project = _.project(config.projects, {
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

module.exports = Grunt;
