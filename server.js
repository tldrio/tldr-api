/**
 * Server for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */


var restify = require('restify')
  , bunyan = require('./lib/logger').bunyan // Audit logger for restify
  , mongoose = require('mongoose')
  , models = require('./models')
  , db = require('./lib/db')
  , requestHandlers = require('./requestHandlers')
  , currentEnvironment = require('./environments').currentEnvironment
  , privateKey = fs.readFileSync('privatekey.pem').toString()
  , certificate = fs.readFileSync('certificate.pem').toString()
  , credentials = crypto.createCredentials({key: privateKey, cert: certificate})
  , server;                                 // Will store our restify server


// Last wall of defense. If an exception makes its way to the top, the service shouldn't
// stop, but log a fatal error and send an email to us.
// Of course, this piece of code should NEVER have to be called.
// Only useful in production environment when we don't want to stop the service. Not set in development environment to get meaningful errors
if (currentEnvironment.environment === "production") {
  process.on('uncaughtException', function(err) {
    // TODO implement email sending
    bunyan.fatal({error: err, message: "An uncaught exception was thrown"});
  });
}

/**
 * Configure 
 */

var // If we're testing, avoid logging everything restify tells us to avoid cluttering the screen
if (currentEnvironment.environment === "test") {
  server = restify.createServer({
    name: "tldr API"
  });
} else {
  server = restify.createServer({
    name: "tldr API",
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
server.get('/tldrs', requestHandlers.getAllTldrs);

// GET a tldr by id
server.get('/tldrs/:id', requestHandlers.getTldrById);

//POST a new tldr
server.post('/tldrs', requestHandlers.postNewTldr);

//POST update existing tldr
server.post('/tldrs/:id', requestHandlers.postUpdateTldr);

// Start server
if (module.parent === null) { // Code to execute only when running as main
	server.listen(8787, function (){
		bunyan.info('Server %s launched at %s', server.name, server.url);
	});
  db.connectToDatabase();
}

// exports
module.exports = server;
