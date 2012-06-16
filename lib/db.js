var mongoose = require('mongoose')
  , env = require('../environments').env;

// Create the Connection to Mongodb
function connectToDatabase (callback) {
  mongoose.connect(env.databaseHost, env.databaseName, env.databasePort, function (err) {
    if (err) { throw err; }
    callback();
  });
}

// Close Connection to Mongo
function closeDatabaseConnection (callback) {
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
}

// Export Mongo connection methods
module.exports.connectToDatabase = connectToDatabase;
module.exports.closeDatabaseConnection = closeDatabaseConnection;
