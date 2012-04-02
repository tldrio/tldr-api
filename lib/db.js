var mongoose = require('mongoose');

// Create a Connection to Mongodb
function connectToDatabase (callback) {
  var cb = callback || function (arg) { return arg;} ;
  mongoose.connect('localhost', 'datastore-test', 27017, function (err) {
    if (err) {throw cb(err);}
    cb();
  });
}

// Close Connection to Mongo
function closeDatabaseConnection (callback) {
  var cb = callback || function (arg) { return arg;} ;
  mongoose.connection.close(function (err) {
    if (err) {throw cb(err);}
    cb();
  });
}
// Export Mongo connection methods
module.exports.connectToDatabase = connectToDatabase;
module.exports.closeDatabaseConnection = closeDatabaseConnection;
