'use strict';

var bashRunner = function(cmd, done) {
    var spawn = require('child_process').spawn;
    var output = null;
    var cp = spawn('bash', ['-c', cmd], {
        stdio: [0, 1, 2]
    });
    cp.on('end', function(data) {
        output = data;
    });
    cp.on('close', function(code) {
        done(null, {
            code: code,
            output: output
        });
    });
};

var Executor = function(runner) {
    runner = runner || bashRunner;
    var self = {};
    var commands = [];
    var finalCommands = [];

    self.queue = function(friendly, command, supressOutput, supressError) {
        commands.push({
            friendly: friendly,
            command: command,
            supressOutput: supressOutput,
            supressError: supressError
        });
    };

    self.finally = function(friendly, command, supressOutput, supressError) {
        finalCommands.push({
            friendly: friendly,
            command: command,
            supressOutput: supressOutput,
            supressError: supressError
        });
    };


    function buildCommands(cmds) {
        /* jshint maxcomplexity: 6 */
        var result = '';
        for (var x = 0; x < cmds.length; x++) {
            var command = cmds[x];
            if (command.friendly) {
                result += 'echo " => ' + command.friendly + '"\n';
            }
            if (command.supressError === true) {
                result += 'set +e\n';
            }
            result += command.command;
            if (command.supressOutput === true) {
                result += ' > /dev/null';
            }
            if (command.supressError === true) {
                result += '\nset -e\n';
            }

            result += '\n';
        }
        return result;
    }

    self.execute = function(done) {
        var cmd = 'set -e\n';
        cmd += buildCommands(commands);
        cmd += buildCommands(finalCommands);
        cmd = cmd + 'exit\n';
        runner(cmd, done);
    };

    self.clear = function() {
        commands = [];
    };

    return self;
};

module.exports = Executor;
