/*
 * All topics are now threads
 * Date: 12/18/2012
 *
 */

var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
  //, Topic = models.Topic
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

, function (cb) {
    var i = 0;

    Post.find({})
      .populate('posts')
      .exec(function(err, posts) {
      if (err) { return cb(err); }

      async.whilst(
        function () { return i < posts.length; }
      , function (cb) {
          var post = posts[i];

          post.thread = post.topic;
          post.save(function(err, post) {
            if (err) { return cb(err); }

            i += 1;
            cb();
        });
      }
      , cb);
    });
  }

, function (cb) {
    var i = 0;

    Post.find({})
      .populate('posts')
      .exec(function(err, posts) {
      if (err) { return cb(err); }

      async.whilst(
        function () { return i < posts.length; }
      , function (cb) {
          var post = posts[i];

          delete post.topic;
          post.save(function(err, post) {
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
