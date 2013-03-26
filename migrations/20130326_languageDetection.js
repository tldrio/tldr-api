/*
 * Get all word counts
 * We set it to true for all tldrs
 * Date: 26/09/2012
 *
 */

var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
  , customUtils = require('../lib/customUtils')
  , Tldr = models.Tldr
  , detectLanguage = require('../lib/detectLanguage')
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
    var i = 0, errorCount = 0;

    Tldr.find({ language: { $exists:false } }, function(err, tldrs) {
      if (err) { return cb(err); }

      console.log("====");
      console.log(tldrs.length);

      async.eachLimit(
        tldrs
      , 10
      , function (tldr, _cb) {
          var possibleUrls = [];
          console.log('Detect language for: ' + tldr._id);

          detectLanguage.populateLanguage(tldr, function (err) {
            if (err) { return _cb(err); }
            _cb();
          });
        }
      , cb
      );
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
