var mongoose = require('mongoose')
  , bunyan = require('./logger').bunyan;

function createDbObject (host, name, port) {
	var dbHost = host
	, dbName = name
	, dbPort = port;
	bunyan.info('Creation db Object with options', dbHost, dbName, dbPort);

	// Create the Connection to Mongodb
	this.connectToDatabase = function (callback) {
		bunyan.info('Connection to Database with options', dbHost, dbName, dbPort);
		mongoose.connect(dbHost, dbName, dbPort, function (err) {
			if (err) { throw err; }
			callback();
		});
	};

	// Close Connection to Mongo
	this.closeDatabaseConnection = function (callback) {
		mongoose.connection.close(function (err) {
			if( callback !== undefined) {
				if (err) {
					throw callback(err);
				}
				callback();
			}
			else if (err) {
				throw err;
			}
		});
	};

}

// Export Object
module.exports = createDbObject;
