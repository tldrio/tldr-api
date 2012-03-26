/**
 * Server for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */


var restify = require('restify')
  , winston = require('./lib/logger.js').winston // Custom logger built with Winston
  , bunyan = require('./lib/logger.js').bunyan // Audit logger for restify
  , mongoose = require('mongoose') // Mongoose ODM to Mongo
  , db = mongoose.connect('mongodb://localhost/datastore-test')
  , models = require('./models')
	, TldrModel = models.TldrModel
  , server = restify.createServer();




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
server.get('/tldrs', function (req, res, next) {
  res.send(403, 'Dont dump the db fucking idiot');
});

// GET a tldr by id
server.get('/tldrs/:id', function (req, res, next) {
	var id = req.params.id;
	TldrModel.find({_id: id}, function (err, docs) {
		res.send(docs[0]);
	});
});



// Start server
if (module.parent === null) {
	server.listen(8787, function (){
		winston.info('Server launched at '+ server.url);
	});
}

// exports
module.exports= server;
