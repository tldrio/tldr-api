/*
 * Migration to give a slug to all current tldrs
 * Date: Nov 22nd, 2012
 *
 */

var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
  , Tldr = models.Tldr
  , DbObject = require('../lib/db')
  , customUtils = require('../lib/customUtils')
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

    console.log("Slugify tldrs");

    Tldr.find({ }, function(err, tldrs) {
      if (err) { return cb(err); }

      async.whilst(
        function () { return i < tldrs.length; }
      , function (cb) {
          tldrs[i].createUnusedSlug(function (err, tldr) {
            tldrs[i].save(function (err) {
              console.log("Slugified " + tldrs[i]._id);
              i += 1;
              cb(err);
            });
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
