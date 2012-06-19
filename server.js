
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
  , consolidate = require('consolidate')
  , server;                                 // Will store our express server


server = express(); // Instantiate server


/*
 * Environments declaration
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
  //server.use(express.logger());
  server.use(express.bodyParser());
  server.use(server.router); // Map routes see docs why we do it here
  server.use(requestHandlers.handleErrors); // Use middleware to handle errors
  server.engine('mustache', consolidate.hogan); // Assign Hogan engin to .mustach files
  server.set('view engine', 'mustache'); // Set mustache as the default extension
  server.set('views', __dirname + '/views');
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

// GET a tldr by id
server.get('/rendering', function (req, res, next) {
  console.log('Rendering');
  debugger;
  var tldr = {
    title: 'A title',
    url: 'http://yetanotherunusedurl.com/somepage',
    summaryBullets: ['A summary'],
    resourceAuthor: 'bozo le clown',
    resourceDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  };
  res.render('page', tldr);
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
