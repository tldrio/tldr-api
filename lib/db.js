var mongoose = require('mongoose');

function createDbObject (host, name, port) {
	var dbHost = host
	, dbName = name
	, dbPort = port;
	console.log('Creation db Object with options', dbHost, dbName, dbPort);

	// Create the Connection to Mongodb
	this.connectToDatabase = function (callback) {
		console.log('Connection to Database with options', dbHost, dbName, dbPort);
		debugger;
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
