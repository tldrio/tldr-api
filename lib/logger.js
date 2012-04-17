/**
 * Module for wrapping Bunyan
 *
 */

var bunyan = require('bunyan')
  , path = require('path')
  , fs = require('fs')
	,	bunyanLogger
  , logDir = './logs';

if(!path.existsSync(logDir)){
  fs.mkdirSync(logDir);
}

bunyanLogger = new bunyan({
      name:'tldr',
      streams: [
        {stream: process.stdout,    level: 'debug'},    // "Debug" level logs should be removed/put at info level once issue is resolved
        {path: logDir+'/global.log', level: 'trace'}     // Everything can go in the log file, our tools are powerful enough to parse it
      ]
    });


//Export logger objects
module.exports.bunyan = bunyanLogger;
