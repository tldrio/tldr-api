/*
 * This migration was necessary once we defined the new required field 'hostname' on tldr
 * We set it to 0 for all tldrs
 * Date: 09/10/2012
 *
 */

var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
  , Topic = models.Topic
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

    console.log('Adding and populating the slug field to the topic schema');

    Topic.find({}, function(err, topics) {
      if (err) { return cb(err); }

      async.each(
        topics
      , function (topic, cb) {

          if (topic.type === 'domain') {
            topic.slug = topic.name
          } else {
            topic.slug = customUtils.slugify(topic.name);
          }
          console.log('Adding slug + ' + topic.slug +' to: ' + topic.name);
          topic.save(function(err) {
            if (err) { return cb(err); }

            cb();
          });
        }
      , cb);
    });
  }
  // test that all the tldrs docs have a hostname field
, function (cb) {
    Topic.find({ slug: { $exists: false } }, function(err, tldrs) {
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
