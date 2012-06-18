
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
  , serve                               // Will store our express serverr
  , RedisStore = require('connect-redis')(express);   // Will manage the connection to our Redis store



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
  server.use(requestHandlers.allowAccessOrigin);

  // Parse body
  server.use(express.bodyParser());

  // Parse cookie data and use redis to store session data
  server.use(express.cookieParser());
  server.use(express.session({ secret: "this is da secret, dawg"    // Used for cookie encryption
                             , key: "tldr.io cookie"                // Name of our cookie
                             , store: new RedisStore }));           // Store to use

  // Map routes before error handling
  server.use(server.router);

  // Use middleware to handle errors
  server.use(requestHandlers.handleErrors);

});


/**
 * Routes
 */

server.get('/test', function(req, res, next) {

  if (req.session.myVar) {
    req.session.myVar += 1;
  } else {
    req.session.myVar = 1;
  }

    res.json(200, {"message": "ca marche " + req.session.myVar});

});

server.get('/retest', function(req, res, next) {
  req.session.myVar = 1;

  res.json(200, {"message": "ca marche -- re"});
});


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


// Connect to database and start server
if (module.parent === null) { // Code to execute only when running as main
  db.connectToDatabase(function() {
    bunyan.info('Connection to database successful');

    server.listen(env.serverPort, function (){
      bunyan.info('Server %s launched at %s', server.name, server.url);
    });
  });
}



// exports
module.exports = server;
