
/**
 * Module dependencies.
 */

var express = require('express')
  , fs = require('fs')
  , bunyan = require('./lib/logger').bunyan // Audit logger for express
  , dbObject = require('./lib/db')
  , requestHandlers = require('./requestHandlers')
  , mongoose = require('mongoose')
  , models = require('./models')
  , serve                               // Will store our express serverr
  , RedisStore = require('connect-redis')(express);   // Will manage the connection to our Redis store


//Create server
server = express();

/*
 * Environments declaration
 */
server.configure('development', function () {
  server.set('envName', 'development');
  server.set('dbHost', 'localhost');
  server.set('dbPort', '27017');
  server.set('dbName', 'dev-db');
  server.set('svPort', 8787);
});

server.configure('test', function () {
  server.set('envName', 'test');
  server.set('dbHost', 'localhost');
  server.set('dbPort', '27017');
  server.set('dbName', 'test-db');
  server.set('svPort', 8787);
});

server.configure('staging', function () {
  server.set('envName', 'staging');
  server.set('dbHost', 'localhost');
  server.set('dbPort', '27017');
  server.set('dbName', 'prod-db');
  server.set('svPort', 9002);
});

server.configure('production', function () {
  server.set('envName', 'production');
  server.set('dbHost', 'localhost');
  server.set('dbPort', '27017');
  server.set('dbName', 'prod-db');
  server.set('svPort', 9001);
});


// Store db Instance in server. Avoid multiple instantiation
// in test files
server.db = new dbObject( server.set('dbHost')
                        , server.set('dbName')
                        , server.set('dbPort')
                        );

/**
 * Last wall of defense. If an exception makes its way to the top, the service shouldn't
 * stop if it is run in production, but log a fatal error and send an email to us.
 * Of course, this piece of code should NEVER have to be called.
 */

server.configure('staging', 'production', function () {
  // The process needs to keep on running
  process.on('uncaughtException', function(err) {
    bunyan.fatal({error: err, message: "An uncaught exception was thrown"});
  });
});

server.configure('development', function () {
  // We stop the server to look at the logs and understand what went wrong
  // We don't do this for tests as it messes up mocha
  // The process needs to keep on running
  process.on('uncaughtException', function(err) {
    bunyan.fatal({error: err, message: "An uncaught exception was thrown"});
    throw err;
  });
});


/*
 * Main server configuration
 * All handlers to be defined here
 */

server.configure(function () {
  server.use(requestHandlers.allowAccessOrigin);

  // Parse body
  server.use(express.bodyParser());

  // Parse cookie data and use redis to store session data
  server.use(express.cookieParser());
  server.use(express.session({ secret: "this is da secret, dawg"    // Used for cookie encryption
                             , key: "tldr.io cookie"                // Name of our cookie
                             , store: new RedisStore }));           // Store to use

  server.use(server.router); // Map routes see docs why we do it here
  server.use(requestHandlers.handleErrors); // Use middleware to handle errors
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


/*
 * Connect to database, then start server
 */
if (module.parent === null) { // Code to execute only when running as main
  server.db.connectToDatabase(function() {
    bunyan.info('Connection to database successful');

    server.listen(server.set('svPort'), function (){
      bunyan.info('Server %s launched in %s environment, on port %s', server.name, server.set('envName'), server.set('svPort'));
    });
  });
}



// exports
module.exports = server;
