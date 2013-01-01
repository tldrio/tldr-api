/*
 * Migration to give a slug to all current topics
 * Date: Nov 22nd, 2012
 *
 */

var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
  , Topic = models.Topic
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

  // Add the slug
, function (cb) {
    var i = 0;

    console.log("Slugify topics");

    Topic.find({ }, function(err, topics) {
      if (err) { return cb(err); }

      async.whilst(
        function () { return i < topics.length; }
      , function (cb) {
          customUtils.createUnusedSlug(topics[i], 'title', 'slug', function () {
            topics[i].save(function (err) {
              console.log("Slugified " + topics[i]._id);
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
