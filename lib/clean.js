'use strict';

var util = require('util');
var async = require('async');
var _ = require('lodash');
var debug = require('debug')('devenv:de:commands:cleaner');

module.exports = Cleaner;

function Cleaner(executor, config) {
    var self = {};

    self.modules = function(options, done) {
        executor.queue('Cleaning node_modules', 'find ' + config.folder + ' -maxdepth 3 | grep -i node_modules | xargs -n 1 rm -rf', true);
        executor.execute(done);
    };

    self.redis = function(options, done) {
        executor.queue('Flushing redis', 'redis-cli -h redis flushdb', true);
        executor.execute(done);
    };

    return self;
}
