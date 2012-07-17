/**
 * Module for wrapping Bunyan
 *
 */

var Bunyan = require('bunyan')
  , path = require('path')
  , bunyanLogger;


bunyanLogger = new Bunyan({
      name:'tldr',
      streams: [
        {stream: process.stdout,    level: 'info'}    // "Debug" level logs should be removed/put at info level once issue is resolved
      ]
    });


//Export logger objects
module.exports.bunyan = bunyanLogger;
