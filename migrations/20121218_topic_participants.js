/*
 * It adds a new participants array to all topics that currently don't have one
 * Date: 12/18/2012
 *
 */

var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
  , Topic = models.Topic
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

    Topic.find({})
      .populate('posts')
      .exec(function(err, topics) {
      if (err) { return cb(err); }

      console.log('Found some topics with no participants array: ' + topics.length);

      async.whilst(
        function () { return i < topics.length; }
      , function (cb) {
          var topic = topics[i];

          console.log('Adding participants array to: ' + topic._id);
          topic.participants = [];
          topic.posts.forEach(function (post) {
            topic.participants.addToSet(post.creator);
          });
          topic.save(function(err, topic) {
            if (err) { return cb(err); }
            console.log('Participants for', topic._id, topic.participants);

            i += 1;
            cb();
        });
      }
      , cb);
    });
  }

, function (cb) {
    Topic.find({ participants: undefined }, function(err, topics) {
      if (topics.length === 0) {
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
