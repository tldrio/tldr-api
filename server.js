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
  , server;                                 // Will store our restify server


/**
 * Configure 
 */

// If we're testing, avoid logging everything restify tells us to avoid cluttering the screen
if (currentEnvironment.environment === "test") {
  server = restify.createServer({
    name: "tldr API"
  });
} else {
  server = restify.createServer({
    name: "tldr API",
    log: bunyan
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
