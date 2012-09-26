/*
 * This migration was necessary once we defined the new required field "versionDisplayed" on tldr
 * We set it to 0 (=current version) if it doesn't exist
 * Date: 26/09/2012
 *
 */

var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
  , Tldr = models.Tldr
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

  // Add the versionDisplayed field
, function (cb) {
    var i = 0;

    console.log("Adding missing versionDisplayed to tldrs");

    Tldr.find({ }, function(err, tldrs) {
      if (err) { return cb(err); }

      async.whilst(
        function () { return i < tldrs.length; }
      , function (cb) {
          console.log('Adding versionDisplayed to: ' + tldrs[i]._id);

          tldrs[i].versionDisplayed = 0;
          tldrs[i].save(function(err) {
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
