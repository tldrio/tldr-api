/*
 * Reset the test database by dropping it so indexes are rebuilt and tested
 * Date: 09/10/2012
 *
 */

var async = require('async')
  , APIClient = require('../models/apiClientModel')
  , mongoose = require('mongoose')
  , DbObject = require('../lib/db')
  , config = require('../lib/config')
  , db = new DbObject( config.dbHost
                     , config.dbName
                     , config.dbPort
                     );

if (process.env.NODE_ENV !== 'test') {
  console.log("I won't run this on anything other than a test databases :P");
  process.exit(0);
}

async.waterfall([
  function (cb) {
    db.connectToDatabase(function() {
      console.log('Connected to test database');
      cb();
    });
  }
, function (cb) {
    console.log("Dropping test database");
    mongoose.connection.db.dropDatabase(function (err, done) {
      cb(err);
    });
  }
], function (err) {
    db.closeDatabaseConnection(function () {
      console.log('Closed connection to test database, ready to launch tests now');
      process.exit(0);
    });
  }
);

