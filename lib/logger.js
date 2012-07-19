/**
 * Module for wrapping Bunyan
 *
 */

var Bunyan = require('bunyan')
  , path = require('path')
  , dgram = require('dgram')
  , udpSocket = dgram.createSocket('udp4')
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


/**
 * Custom function that to log our message with some relevant request information
 *
 * @param {String} level one of 'debug', 'info', 'warn', 'error' or 'fatal' indicating which bunyan native method to use
 * @param {Object} req the request. Depending on where the logging function is called, some fields such as user may not be populated if called before passport middleware
 * @param {String or Object} toLog either a short message or a whole object to be logged
 */
bunyanLogger.customLog = function (level, req, toLog) {
  var finalLog = {}, prop;

  // General info to help us track each individual request better
  finalLog.requestId = req.requestId;
  finalLog.method = req.method;
  finalLog.url = req.url;
  finalLog.clientIP = req.socket && (req.socket.remoteAddress || (req.socket.socket && req.socket.socket.remoteAddress));   // Taken from Connect logger

  // Info on user originating request
  finalLog.loggedUser = req.user ? req.user._id : "Nobody logged";

  // Add information in toLof to finalLog, format depending on whether toLog is a string or an object
  if (typeof toLog === "string") {
    finalLog.message = toLog;
  } else {
    for (prop in toLog) { if (toLog.hasOwnProperty(prop)) { finalLog[prop] = toLog[prop]; } }
  }

  this[level](finalLog);
};


/**
 * Send an "increment metric" message to statsd through UDP (so that a failure fron statsd doesn't put the api in a unstable state)
 *
 * @param {String} counter the name of the counter to increment
 * @param {Object} req optional - if provided, we also log the fact that the metric was incremented
 */
bunyanLogger.incrementMetric = function(counter, req) {
  var message = new Buffer(counter + ":1|c");

  udpSocket.send(message, 0, message.length, 8125);

  if (req) {
    this.customLog("debug", req, "Metric " + counter + " incremented");
  }
};


//Export logger objects
module.exports.bunyan = bunyanLogger;
