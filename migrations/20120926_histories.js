/*
 * This migration was necessary once we defined the new required field "history" on Tldr and User
 * It adds a new history to all Tldrs and Users that currently don't have one
 * Date: 26/09/2012
 *
 */

var async = require('async')
  , DbObject = require('../lib/db')
  , config = require('../lib/config')
  , db = new DbObject( config.dbHost
                     , config.dbName
                     , config.dbPort
                     );

console.log('===== Beginning migration =====');
console.log('Connecting to DB ' + config.dbHost + ':' + config.dbPort + '/' + config.dbName)

async.waterfall([
  function (cb) {
    db.connectToDatabase(function() {
      console.log('Connected');
      cb();
    });
  }
, function (cb) {
    console.log("Do something");
    cb();
  }
, function (cb) {
    db.closeDatabaseConnection(function () {
      console.log("Closed connection to database");
      process.exit(0);
    });
  }
]);
