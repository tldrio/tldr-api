/**
 * Module dependencies.
 */

var express = require('express')
  , fs = require('fs')
  , bunyan = require('./lib/logger').bunyan // Audit logger for express
  , DbObject = require('./lib/db')
  , mongoose = require('mongoose')
  , models = require('./lib/models')
  , consolidate = require('consolidate')
  , server                               // Will store our express serverr
  , config = require('./lib/config')
  , middleware = require('./lib/middleware')
  , passport = require('./lib/passport')
  , routes = require('./lib/routes')
  , customUtils = require('./lib/customUtils');



server = express(); // Instantiate server

// Store db Instance in server. Avoid multiple instantiation in test files
server.db = new DbObject( config.dbHost
                        , config.dbName
                        , config.dbPort
                        );

// Used for HTML templating
server.engine('mustache', consolidate.hogan); // Assign Hogan engine to .mustache files
server.set('view engine', 'mustache'); // Set mustache as the default extension
server.set('views', __dirname + '/templates');
server.locals = config.locals;


/**
 * Middlewares
 *
 */

server.use(middleware.CORS);
server.use(express.bodyParser());
server.use(express.cookieParser());// Parse cookie data and use redis to store session data
server.use(express.session(config.session));
server.use(passport.initialize());// Use Passport for authentication and sessions
server.use(passport.session());
server.use(middleware.decorateRequest); //Middleware for assigning an id to each request and add logging
server.use(server.router); // Map routes
server.use(middleware.handleErrors); // Use middleware to handle errors
server.use(express.static(__dirname + '/css'));
server.use(function(req, res, next) {// Middleware to send a dummy empty favicon so as to be able to debug easily
  if (req.url === '/favicon.ico') {
    return res.send(200, '');
  } else {
    return next();
  }
});



/*
 * Environments declaration and
 * Express' default environment is 'development'
 */


server.configure('development', 'staging', 'production', function () {
  bunyan.setToLog = true;
});

/**
 * Last wall of defense. If an exception makes its way to the top, the service shouldn't
 * stop if it is run in production, but log a fatal error and send an email to us.
 * Of course, this piece of code should NEVER have to be called
 *
 * For development, we want the server to stop to understand what went wrong
 *
 * We don't do this for tests as it messes up mocha
 * The process needs to keep on running
 */
server.configure('staging', 'production', function () {
  // The process needs to keep on running
  process.on('uncaughtException', function(err) {
    bunyan.fatal({error: err, message: 'An uncaught exception was thrown'});
  });
});



/**
 * Routes
 *
 */

//Misc
server.get('/confirm', routes.confirmUserEmail);
server.get('/resendConfirmToken', routes.resendConfirmToken);

//Users
server.post('/users', routes.createNewUser); // User creation
server.get('/users/you', routes.getLoggedUser);// Get/set personal information
server.get('/users/you/createdtldrs', routes.getCreatedTldrs);
server.put('/users/you', routes.updateUserInfo);
server.put('/users/you/updatePassword', routes.updatePassword);
server.post('/users/login', passport.authenticate('local'), routes.getLoggedUser);// Handles a user connection and credentials check.
server.get('/users/logout', routes.logout);

//tldrs
server.get('/tldrs/search', routes.searchTldrs);// Search tldrs
server.get('/tldrs', routes.searchTldrs); // Convenience route
server.get('/tldrs/latest/:quantity', routes.getLatestTldrs);// GET latest tldrs (convenience route)
server.get('/tldrs/:id', routes.getTldrById);// GET a tldr by id
server.post('/tldrs', routes.createNewTldr);//POST create tldr
server.put('/tldrs/:id', routes.updateTldrWithId);//PUT update tldr



/*
 * Connect to database, then start server
 */
if (module.parent === null) { // Code to execute only when running as main
  server.db.connectToDatabase(function() {
    //bunyan.info('Connection to database successful');
    server.listen(config.svPort, function (){
      bunyan.info('Server %s launched in %s environment, on port %s. Db name is %s on port %d', server.name, config.env, config.svPort, config.dbName, config.dbPort);
    });
  });
}


// exports
module.exports = server;
