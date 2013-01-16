/*
 * Reset the database by removing everything except the API clients
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

if (process.env.NODE_ENV) {
  console.log("I won't run this on anything other than local databases :P");
  process.exit(0);
}

async.waterfall([
  function (cb) {
    db.connectToDatabase(function() {
      console.log('Connected');
      cb();
    });
  }
, function (cb) {
    console.log("Dropping database");
    mongoose.connection.db.dropDatabase(function (err, done) {
      cb(err);
    });
  }
, function (cb) {
    var bmLocal = { name: 'bm-local', key: 'fF5TVeCAlTqsLjEpNCb9' }
      , crxLocal = { name: 'chrome-ext-local', key: 'JjlZcfAW8NMFWXSCIeiz' }
      ;

    console.log("Recreating the two local clients");
    APIClient.createAndSaveInstance(bmLocal, function (err, apic) {
      APIClient.createAndSaveInstance(crxLocal, function (err, apic) {
        cb();
      });
    });
  }
], function (err) {
    db.closeDatabaseConnection(function () {
      console.log('Closed connection to database');
      process.exit(0);
    });
  }
);

