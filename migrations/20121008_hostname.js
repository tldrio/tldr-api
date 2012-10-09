/*
 * This migration was necessary once we defined the new required field 'hostname' on tldr
 * We set it to 0 for all tldrs
 * Date: 09/10/2012
 *
 */

var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
  , Tldr = models.Tldr
  , DbObject = require('../lib/db')
  , config = require('../lib/config')
  , customUtils = require('../lib/customUtils')
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

  // Add the hostname field to all tldr docs
, function (cb) {
    var i = 0;

    console.log('Adding and populating the hostname field to the tldr schema');

    Tldr.find({}, function(err, tldrs) {
      if (err) { return cb(err); }

      async.whilst(
        function () { return i < tldrs.length; }
      , function (cb) {
          console.log('Adding hostname to: ' + tldrs[i]._id);

          tldrs[i].hostname = customUtils.getHostnameFromUrl(tldrs[i].url);
          tldrs[i].save(function(err) {
            if (err) { return cb(err); }

            i += 1;
            cb();
          });
        }
      , cb);
    });
  }
  // test that all the tldrs docs have a hostname field
, function (cb) {
    Tldr.find({ hostname: { $exists: false } }, function(err, tldrs) {
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
      console.log('Closed connection to database');
      process.exit(0);
    });
  }
);
