
/**
 * Module dependencies.
 */

var express = require('express')
  , fs = require('fs')
  , bunyan = require('./lib/logger').bunyan // Audit logger for express
  , db = require('./lib/db')
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
server = express();

// Configuration

server.configure(function(){
  server.use(express.bodyParser());
  // Map routes see docs why we do it here
  server.use(server.router);
  // Use middleware to handle errors
  server.use(requestHandlers.handleErrors);
  
});


/**
 * Routes
 */

// Search tldrs
server.get('/tldrs/search', requestHandlers.searchTldrs);
server.get('/tldrs', requestHandlers.searchTldrs); // convenience route

// GET latest tldrs (convenience route)
server.get('/tldrs/latest/:quantity', requestHandlers.getLatestTldrs);

// GET a tldr by id
server.get('/tldrs/:id', requestHandlers.getTldrById);

//POST create tldr
server.post('/tldrs', requestHandlers.postNewTldr);

//PUT update tldr
server.put('/tldrs/:id', requestHandlers.putUpdateTldrWithId);


// Start server
if (module.parent === null) { // Code to execute only when running as main
  server.listen(env.serverPort, function (){
    bunyan.info('Server %s launched at %s', server.name, server.url);
  });
  db.connectToDatabase();
}

// exports
module.exports = server;
