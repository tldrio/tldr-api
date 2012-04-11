/**
 * Module for wrapping Bunyan
 *
 */

var bunyan = require('bunyan'),
		bunyanLogger = new bunyan({
      name:'tldr',
      streams: [
        {stream: process.stdout,    level: 'debug'},    // "Debug" level logs should be removed/put at info level once issue is resolved
        {path: './logs/global.log', level: 'trace'}     // Everything can go in the log file, our tools are powerful enough to parse it
      ]
    });


//Export logger objects
module.exports.bunyan = bunyanLogger;
