/*!
 *  Server for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */


/***********************************/
/* Require dependencies            */
/***********************************/
var restify = require('restify')
  , winston = require('./lib/logger.js').winston // Custom logger built with Winston
  , bunyan = require('./lib/logger.js').bunyan // Bunyan Logger for restify integration
  , mongoose = require('mongoose') // Mongoose Wrapper to Mongo
  , models = require('./lib/data-models.js'); // Load datamodels

var server = restify.createServer(),
		db,
		TldrModel;

/***********************************/
/* Database related functions */
/***********************************/

function loadModels () {
	//Define model and define callback which will
	//be called after model definition succeeds
	models.defineModels(mongoose, function () {
		// Load model
		TldrModel = mongoose.model('tldrObject');
	});
}

//Open mongo connection
function openMongooseConnection (callback) {
	db = mongoose.connect('mongodb://localhost/datastore-test', function (err) {
		if (err) {
			throw err;
		}
		callback();
	});
}

//Close Mongo Connection
function closeMongooseConnection (callback) {
	mongoose.connection.close();
	callback();
}

/***********************************/
/* Bundle Plugins Restify          */
/***********************************/


server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

/********************/
/* Routing          */
/********************/


// Full tldrs list
server.get('/tldrs', function (req, res, next) {
  res.send(403, 'Dont dump the db fucking idiot');
});

/**
 * Get tldr identified by one id
 * 
 * @return {Tldr Object} Returns the Tldr object corresponding to the
 *											 required id
 */


server.get('/tldrs/:id', function (req, res, next) {
	var id = req.params.id;
	TldrModel.find({_id: id}, function (err, docs) {
		res.send(docs[0]);
	});
});


/********************/
/* Start server     */
/********************/

// Start server
if (module.parent === null) {
	server.listen(8787, function (){
		winston.info('Server launched at '+ server.url);
	});
}

/********************/
/* Exports          */
/********************/

module.exports = server;
module.exports.openMongooseConnection = openMongooseConnection;
module.exports.closeMongooseConnection = closeMongooseConnection;
module.exports.loadModels = loadModels;
