/*
 * Get all word counts for tldrs
 * We set it to true for all tldrs
 * Date: 26/09/2012
 *
 */

var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
  , customUtils = require('../lib/customUtils')
  , Tldr = models.Tldr
  , articleParsing = require('../lib/articleParsing')
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

    Tldr.find({}, function(err, tldrs) {
      if (err) { return cb(err); }

      console.log("====");
      console.log(tldrs.length);

      async.whilst(
        function () { return i < tldrs.length; }
      , function (_cb) {
          var possibleUrls = [];
          console.log('Get tldr word count for: ' + tldrs[i]._id);

          tldrs[i].wordCount = customUtils.getWordCount(tldrs[i].summaryBullets);

          tldrs[i].save(function (err) {
            i += 1;
            _cb(err);
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
