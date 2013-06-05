/*
 * It adds a new participants array to all topics that currently don't have one
 * Date: 12/18/2012
 *
 */

var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
  , Thread = models.Thread
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
    var i = 0;

    console.log("Adding missing notifs array to user");

    Thread.find({})
      .populate('posts')
      .exec(function(err, threads) {
      if (err) { return cb(err); }

      async.whilst(
        function () { return i < threads.length; }
      , function (cb) {
          var thread = threads[i];

          thread.archived = false;
          thread.save(function(err) {
            if (err) { return cb(err); }

            i += 1;
            cb();
        });
      }
      , cb);
    });
  }

], function (err) {
    if (err) {
      console.log('Something unexpected occured, stopped migration. ', err);
    }

    db.closeDatabaseConnection(function () {
      console.log("Closed connection to database");
      process.exit(0);
    });
  }
);
