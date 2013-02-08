/*
 * Reset the database by removing everything except the API clients
 * Date: 09/10/2012
 *
 */

var async = require('async')
  , APIClient = require('../models/apiClientModel')
  , User = require('../models/userModel')
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
    var bmLocal = { name: 'bm-local', key: 'fF5TVeCAlTqsLjEpNCb9', isOfficial: true }
      , crxLocal = { name: 'chrome-ext-local', key: 'JjlZcfAW8NMFWXSCIeiz', isOfficial: true }
      ;

    console.log("Recreating the two local clients");
    APIClient.createAndSaveInstance(bmLocal, function (err, apic) {
      APIClient.createAndSaveInstance(crxLocal, function (err, apic) {
        cb();
      });
    });
  }
, function (cb) {
    var louis = { username: 'Louis', email: 'louis.chatriot@gmail.com', password: 'internet' }
      , stan = { username: 'Stan', email: 'stanislas.marion@gmail.com', password: 'internet' }
      , charles = { username: 'Charles', email: 'charles.miglietti@gmail.com', password: 'internet' }
      ;

    console.log("Recreating three fake accounts");
    User.createAndSaveInstance(louis, function () {
      User.createAndSaveInstance(stan, function () {
        User.createAndSaveInstance(charles, function () {
          cb();
        });
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

