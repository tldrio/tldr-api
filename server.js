/**
 * Server for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */


var restify = require('restify')
  , winston = require('./lib/logger.js').winston // Custom logger built with Winston
  , bunyan = require('./lib/logger.js').bunyan // Audit logger for restify
  , server = restify.createServer()
  , requestHandlers = require("./requestHandlers.js");




/**
 * Configure 
 */

// Register restify middleware
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());





/**
 * Routes
 */

// GET all tldrs
server.get('/tldrs', requestHandlers.getAllTldrs);

// GET a tldr by id
server.get('/tldrs/:id', requestHandlers.getTldrById);



// Start server
if (module.parent === null) { //wtf is this shit?
	server.listen(8787, function (){
		winston.info('Server launched at '+ server.url);
	});
}

// exports
module.exports = server;
