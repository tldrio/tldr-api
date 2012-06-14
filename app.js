
/**
 * Module dependencies.
 */

var express = require('express')
  , fs = require('fs')
  , bunyan = require('./lib/logger').bunyan // Audit logger for express
  , db = require('./lib/db')
  , errors = require('./lib/errors')
  , requestHandlers = require('./requestHandlers')
  , env = require('./environments').env
  , mongoose = require('mongoose')
  , models = require('./models')
  , server;                                 // Will store our express server



/**
 * Last wall of defense. If an exception makes its way to the top, the service shouldn't
 * stop, but log a fatal error and send an email to us.
 * Of course, this piece of code should NEVER have to be called.
 */

if (env.name === "production") {
  // The process needs to keep on running
  process.on('uncaughtException', function(err) {
    bunyan.fatal({error: err, message: "An uncaught exception was thrown"});
  });
} else if (env.name !== "test") {
  // We stop the server to look at the logs and understand what went wrong
  // We don't do this for tests as it messes up mocha
  process.on('uncaughtException', function(err) {
    bunyan.fatal({error: err, message: "An uncaught exception was thrown"});
    throw err;
  });
}

//Create server
server = express.createServer();

// Configuration

server.configure(function(){
  server.set('views', __dirname + '/views');
  server.set('view engine', 'jade');
  server.use(express.bodyParser());
  server.use(express.methodOverride());
  server.use(express.static(__dirname + '/public'));
  server.use(server.router);
  server.use(requestHandlers.handleErrors);
});

server.configure('development', function(){
  server.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

server.configure('production', function(){
  server.use(express.errorHandler());
});

/**
 * Routes
 */

// Search tldrs
server.get('/tldrs/search/', requestHandlers.searchTldrs);
server.get('/tldrs/', requestHandlers.searchTldrs); // convenience route

// GET latest tldrs (convenience route)
server.get('/tldrs/latest/:quantity', requestHandlers.getLatestTldrs);

// GET a tldr by url
server.get('/tldrs/:url', requestHandlers.getTldrByUrl);

//PUT create or update tldr
server.put('/tldrs/:url', requestHandlers.putTldrByUrl);


// Start server
if (module.parent === null) { // Code to execute only when running as main
  server.listen(env.serverPort, function (){
    bunyan.info('Server %s launched at %s', server.name, server.url);
  });
  db.connectToDatabase();
}

// exports
module.exports = server;
