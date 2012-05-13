/**
 * Server for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */


var restify = require('restify')
  , fs = require('fs')
  , bunyan = require('./lib/logger').bunyan // Audit logger for restify
  , mongoose = require('mongoose')
  , models = require('./models')
  , db = require('./lib/db')
  , requestHandlers = require('./requestHandlers')
  , privateKey = fs.readFileSync('./privatekey.pem').toString()
  , certificate = fs.readFileSync('./certificate.pem').toString()
  , env = require('./environments').env
  , server;                                 // Will store our restify server



/**
 * Last wall of defense. If an exception makes its way to the top, the service shouldn't
 * stop, but log a fatal error and send an email to us.
 * Of course, this piece of code should NEVER have to be called.
 * Only useful in production environment when we don't want to stop the service. Not set in development environment to get meaningful errors
 */

if (env.name === "production") {
  process.on('uncaughtException', function(err) {
    // TODO implement email sending
    bunyan.fatal({error: err, message: "An uncaught exception was thrown"});
  });
}




/**
 * Configure 
 */

// If we're testing, avoid logging everything restify throws at us to avoid cluttering the screen
if (env.name === "test") {
  server = restify.createServer({
    name: "tldr API",
    //log: bunyan
    //key: privateKey, 
    //certificate: certificate
  });
} else {
  server = restify.createServer({
    name: "tldr API",
    //key: privateKey, 
    //certificate: certificate
    //log: bunyan     // No restify logging for now
  });
}

// Register restify middleware
server.use(restify.acceptParser(server.acceptable));
server.use(restify.authorizationParser());
server.use(restify.queryParser({mapParams: false}));
server.use(restify.bodyParser({mapParams: false}));


/**
 * Routes
 */

// GET all tldrs
server.get({path: '/tldrs', version: '0.1.0'}, requestHandlers.getTldrsWithQuery);

// GET a tldr by url
server.get({path: '/tldrs/:url', version: '0.1.0'}, requestHandlers.getTldrByUrl);

//PUT create or update tldr
server.put({path: '/tldrs/:url', version: '0.1.0'}, requestHandlers.putTldrByUrl);


// Start server
if (module.parent === null) { // Code to execute only when running as main
  server.listen(8787, function (){
    bunyan.info('Server %s launched at %s', server.name, server.url);
  });
  db.connectToDatabase();
}

// exports
module.exports = server;
