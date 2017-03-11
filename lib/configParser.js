'use strict';
var _ = require('lodash');
var Path = require('path');
var util = require('util');
var url = require('url');
var parser = require('ssh-url');

var ConfigParser = function() {
    var self = {};
    var debug = require('debug')('jamlen:de:configparser');
    var config;

    var SSHRepo = function(repo, project) {
        var debug = require('debug')('jamlen:de:sshrepo');
        var branch = project.defaultBranch || config.defaultBranch;
        var parsedUrl = parser.parse(repo);
        var pathname = _.trim(parsedUrl.pathname, '/');
        if (_.includes(pathname, '@')) {
            var s = pathname.split('@');
            pathname = s[0];
            branch = s[1];
        }
        if (_.endsWith(pathname, '.git')) {
            pathname = _.trim(pathname, '.git');
        }
        var ghPath = pathname.split('/');
        var ghUser = ghPath[0];
        var ghRepo = ghPath[1];

        var path = Path.join(self.folder, parsedUrl.hostname, ghUser, ghRepo);

        return {
            name: ghPath.join('/'),
            url: util.format('%s@%s:%s', parsedUrl.user, parsedUrl.hostname, pathname),
            path: path,
            branch: branch
        };
    };

    var HTTPSRepo = function(repo, project) {
        var parsedUrl = url.parse(repo);
        var branch = project.defaultBranch || config.defaultBranch;
        var defaultRepo = project.defaultRepo || config.defaultRepo;
        var pathname = _.trim(parsedUrl.pathname, '/');
        if (_.includes(pathname, '@')) {
            var s = pathname.split('@');
            pathname = s[0];
            branch = s[1];
        }
        if (_.endsWith(pathname, '.git')) {
            pathname = _.trim(pathname, '.git');
        }
        var ghPath = pathname.split('/');
        var ghUser = ghPath[0];
        var ghRepo = ghPath[1];
        var path = Path.join(self.folder, parsedUrl.hostname, ghUser, ghRepo);
        return {
            name: ghPath.join('/'),
            url: util.format('%s//%s%s', parsedUrl.protocol, parsedUrl.hostname, pathname),
            path: path,
            branch: branch
        };
    };

    function mapRepos(repo, project) {
        if (_.startsWith(repo, 'http')) {
            debug('making a Repo for', repo);
            return new HTTPSRepo(repo, project);
        }
        if (!_.startsWith(repo, 'git@')) {
            repo = config.defaultRepo + ':' + repo;
        }
        debug('making a SSHRepo for', repo);
        return new SSHRepo(repo, project);
    }

    var Project = function(json) {
        debug('building project', json.name);
        json.repos = _.map(json.repos, function(repo) {
            return mapRepos(repo, json);
        });
        json.modules = _.map(json.modules, function(module) {
            return mapRepos(module, json);
        });
        return json;
    };

    var addDependencies = function(project, dep) {
        if (dep.length > 0) {
            project.repos = project.repos.concat(dep.repos);
        }
    };

    function resolvePath(string) {
        if (string.substr(0, 1) === '~') {
            string = process.env.HOME + string.substr(1);
        }
        return Path.resolve(string);
    }

    self.parse = function(path) {
        try {
            config = require(path);
            debug('config loaded', require('util').inspect(config, {depth: 10}));
        } catch (e) {
            try {
                config = require('yamljs').load(path);
                debug('yaml config loaded', require('util').inspect(config, {depth: 10}));
            } catch (err) {
                debug(err);
                console.error('ERROR: unable to parse the config. Must be either json or yaml format.');
                process.exit(-1);
            }
        }
        self.filename = path;
        self.raw = _.cloneDeep(config);
        self.folder = resolvePath(config.folder);
        self.depcheck = _.result(config, 'depcheck', {});
        self.npmInstalls = _.result(config, 'npmInstalls', []);
        self.setupCommands = _.result(config, 'setupCommands', ['git pull', 'npm link', 'npm install', 'app start']);
        self.projects = _.transform(config.projects, function(projects, project) {
            projects[project.name] = new Project(project);
            return projects;
        }, {});
        self.modules = _.map(config.modules, mapRepos);

        self.allRepos = [];
        self.allProjectRepos = [];
        self.allProjectUrls = [];

        _.each(self.projects, function(project) {
            if (!project.excludeFromAll) {
                self.allRepos = self.allRepos.concat(project.repos);
                self.allProjectRepos = self.allProjectRepos.concat(project.repos);
                if (project.urls) {
                    self.allProjectUrls = self.allProjectUrls.concat(project.urls);
                }
            }
        });

        // Return only unique items based on their git url
        self.allRepos = _.uniq(self.allRepos.concat(self.modules), function(i) {
            return i.url;
        });

        // Now we need to apply the "depends" flag.
        _.each(self.projects, function(project) {
            if (project.depends && project.depends.length > 0) {
                _.each(project.depends, function(dep) {
                    addDependencies(project, _.filter(self.projects, {
                        name: dep
                    })[0]);
                });
            }
        });
    };

    return self;
};

module.exports = ConfigParser;
