/*
 * Adds a pointer to the parent topic to all posts
 * Date: Jan 9th, 2013
 *
 */

var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
  , Topic = models.Topic
  , Post = models.Post
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

, function (bigcb) {
    console.log("Adding pointer to parent topic to posts");

    Topic.find({})
      .populate('posts')
      .exec(function(err, topics) {
      if (err) { return cb(err); }

      async.forEach(topics, function (topic, tcb) {
        var i = 0;
        console.log('Adding pointers to posts in topic: ' + topic._id);

        async.whilst(
          function () { return i < topic.posts.length; }
        , function (cb) {
            topic.posts[i].topic = topic._id;
            topic.posts[i].save(function(err, post) {
              if (err) { return cb(err); }
              console.log('Post updated: ' + post._id);

              i += 1;
              cb();
            });
          }
        , tcb);
      }, bigcb);
    });
  }

, function (cb) {   // Test that it went fine
    Post.find({}, function (err, posts) {
      var i = 0;
      async.whilst(
        function () { return i < posts.length }
      , function (cb) {
          var post = posts[i];
          i += 1;

          Topic.findOne({ _id: post.topic }, function (err, topic) {
            var found = false;

            topic.posts.forEach(function (p) {
              if (p.toString() === post._id.toString()) { found = true; }
            });

            if (! found) { console.log("WTF"); }
            cb();
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
