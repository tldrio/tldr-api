
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
 * Express' default environment is 'development'
 */
server.configure('development', function () {
  server.set('dbHost', 'localhost');
  server.set('dbPort', '27017');
  server.set('dbName', 'dev-db');
  server.set('svPort', 8787);
});

server.configure('test', function () {
  server.set('dbHost', 'localhost');
  server.set('dbPort', '27017');
  server.set('dbName', 'test-db');
  server.set('svPort', 8787);
});

server.configure('staging', function () {
  server.set('dbHost', 'localhost');
  server.set('dbPort', '27017');
  server.set('dbName', 'prod-db');
  server.set('svPort', 9002);
});

server.configure('production', function () {
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
                             , store: new RedisStore() }));           // Store to use

  server.use(server.router); // Map routes see docs why we do it here
  server.use(requestHandlers.handleErrors); // Use middleware to handle errors
});


/**
 * Routes
 */

// User management
server.post('/users/create', requestHandlers.createNewUser);
server.post('/users/login', requestHandlers.logUserIn);
server.get('/users/logout', requestHandlers.logUserOut);

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


// Needed for now, for test purposes. Will be handled by a website widget afterwards
server.get('/users/create', function(req, res, next) {
  res.send(200, '<form method="POST" action="http://localhost:8787/users/create">'
              + 'Login (email address): <input type="text" name="login"><br />'
              + 'Real name: <input type="text" name="name"><br />'
              + 'Password :<input type="text" name="password"><br />'
              + '<input type="submit" value="Gogogo"></form>');
});

// Also needed for now for test purposes. Will be handled by a website/BM widget afterwards
server.get('/users/login', function(req, res, next) {
  res.send(200, '<form method="POST" action="http://localhost:8787/users/login">'
              + 'Login (email address): <input type="text" name="login"><br />'
              + 'Password: <input type="text" name="password"><br />'
              + '<input type="submit" value="Gogogo"></form>');
});

// The same as the two above!
server.get('/users/whoshere', function (req, res, next) {
  if (req.session && req.session.loggedUser) {
    res.json(200, { message: "You are logged in", loggedUser: req.session.loggedUser });
  } else {
    res.json(200, { message: "You are not logged in" });
  }
});



/*
 * Connect to database, then start server
 */
if (module.parent === null) { // Code to execute only when running as main
  server.db.connectToDatabase(function() {
    bunyan.info('Connection to database successful');

    server.listen(server.set('svPort'), function (){
      bunyan.info('Server %s launched in %s environment, on port %s', server.name, server.set('env'), server.set('svPort'));
    });
  });
}



// exports
module.exports = server;
