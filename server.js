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
  , currentEnvironment = require('./environments').currentEnvironment
  , privateKey = fs.readFileSync('privatekey.pem').toString()
  , certificate = fs.readFileSync('certificate.pem').toString()
  , server;                                 // Will store our restify server



/**
 * Last wall of defense. If an exception makes its way to the top, the service shouldn't
 * stop, but log a fatal error and send an email to us.
 * Of course, this piece of code should NEVER have to be called.
 * Only useful in production environment when we don't want to stop the service. Not set in development environment to get meaningful errors
 */

if (currentEnvironment.environment === "production") {
  process.on('uncaughtException', function(err) {
    // TODO implement email sending
    bunyan.fatal({error: err, message: "An uncaught exception was thrown"});
  });
}




/**
 * Configure 
 */

// If we're testing, avoid logging everything restify throws at us to avoid cluttering the screen
if (currentEnvironment.environment === "test") {
  server = restify.createServer({
    name: "tldr API",
    key: privateKey, 
    certificate: certificate
  });
} else {
  server = restify.createServer({
    name: "tldr API",
    key: privateKey, 
    certificate: certificate
    //log: bunyan     // No restify logging for now
  });
}

// Register restify middleware
server.use(restify.acceptParser(server.acceptable));
server.use(restify.authorizationParser());
server.use(restify.queryParser({mapParams: false}));
server.use(restify.bodyParser({mapParams: false}));
server.use(authenticate);


function authenticate (req, res, next) {
  if (req.username === 'Magellan' && req.authorization.basic.password === 'VascoDeGama') {
    return next();
  }
  else {
    return next(new restify.NotAuthorizedError('Username and Password don\'t match any record'));
  }
}



/**
 * Routes
 */

// GET all tldrs
server.get({path: '/tldrs', version: '0.1.0'}, requestHandlers.getAllTldrs);

// GET a tldr by id
server.get({path: '/tldrs/:id', version: '0.1.0'}, requestHandlers.getTldrById);

// GET tldrs by hostname
server.get({path: 'domains/:hostname/tldrs', version: '0.1.0'}, requestHandlers.getAllTldrsByHostname);

// GET latest tldrs with limit number
server.get('tldrs/latest/:number', requestHandlers.getLatestTldrs);

//POST a new tldr or update existing tldr
server.post({path: '/tldrs', version: '0.1.0'}, requestHandlers.postCreateOrUpdateTldr);



// Start server
if (module.parent === null) { // Code to execute only when running as main
	server.listen(8787, function (){
		bunyan.info('Server %s launched at %s', server.name, server.url);
	});
  db.connectToDatabase();
}

// exports
module.exports = server;
