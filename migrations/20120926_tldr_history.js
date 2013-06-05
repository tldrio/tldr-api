/*
 * This migration was necessary once we defined the new required field "history" on Tldr
 * It adds a new history to all tldrs that currently don't have one
 * Date: 26/09/2012
 *
 */

var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
  , Tldr = models.Tldr
  , TldrHistory = models.TldrHistory
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

  // Add a new TldrHistory to tldrs that currently don't have one
, function (cb) {
    var i = 0;

    console.log("Adding missing histories to tldrs");

    Tldr.find({ history: undefined }, function(err, tldrs) {
      if (err) { return cb(err); }

      console.log('Found some tldrs with no history: ' + tldrs.length);

      async.whilst(
        function () { return i < tldrs.length; }
      , function (cb) {
          var newHistory;

          if (! tldrs[i].history) {
            console.log('Adding history to: ' + tldrs[i]._id);

            newHistory = new TldrHistory();
            newHistory.save(function (err) {
              if (err) { return cb(err); }

              tldrs[i].history = newHistory;
              tldrs[i].save(function(err) {
                if (err) { return cb(err); }

                i += 1;
                cb();
              });
            });
          }
        }
      , cb);
    });
  }

  // Check that all tldrs have a TldrHistory now
, function (cb) {
    Tldr.find({ history: undefined }, function(err, tldrs) {
      if (tldrs.length === 0) {
        console.log("Everything worked");
      } else {
        console.log("Wtf it didnt work");
      }

      cb();
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
