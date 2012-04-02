/**
 * Server for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */


var restify = require('restify')
  , winston = require('./lib/logger.js').winston // Custom logger built with Winston
  , bunyan = require('./lib/logger.js').bunyan // Audit logger for restify
  , server = restify.createServer()
  , mongoose = require('mongoose')
  , models = require('./models')
  , db = require('./lib/db')
  , requestHandlers = require('./requestHandlers');




/**
 * Configure 
 */

// Register restify middleware
server.use(restify.acceptParser(server.acceptable));
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
		winston.info('Server launched at '+ server.url);
	});
  db.connectToDatabase();
}

// exports
module.exports= server;
