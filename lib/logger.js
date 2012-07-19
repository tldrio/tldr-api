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
        {stream: process.stdout,    level: 'debug'}    // "Debug" level logs should be removed/put at info level once issue is resolved
      ]
    });

bunyanLogger.nativeLoggers = { debug: bunyanLogger.debug
                             , info: bunyanLogger.info
                             , warn: bunyanLogger.warn
                             , error: bunyanLogger.error
                             , fatal: bunyanLogger.fatal };

// Custom function that to log our message with some relevant request information
bunyanLogger.customInfo = function (req, toLog) {
  var finalLog = {}, prop;

  // General info to help us track each individual request better
  finalLog.requestId = req.requestId;
  finalLog.method = req.method;
  finalLog.url = req.url;
  finalLog.clientIP = req.socket && (req.socket.remoteAddress || (req.socket.socket && req.socket.socket.remoteAddress));   // Taken from Connect logger

  // Info on user originating request
  finalLog.loggedUser = req.user ? req.user._id : "Nobody logged (or req.user not yet populated)";

  // Add information in toLof to finalLog, format depending on whether toLog is a string or an object
  if (typeof toLog === "string") {
    finalLog.message = toLog;
  } else {
    for (prop in toLog) { if (toLog.hasOwnProperty(prop)) { finalLog[prop] = toLog[prop]; } }
  }

  this.info(finalLog);
}


//Export logger objects
module.exports.bunyan = bunyanLogger;
