var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
  , customUtils = require('../lib/customUtils')
  , Tldr = models.Tldr
  , Topic = models.Topic
  , DbObject = require('../lib/db')
  , config = require('../lib/config')
  , categoryToRemove = 'Startups'
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

    Topic.findOne({ type: 'category', name: categoryToRemove }, function (err, category) {
      if (err) { return cb(err); }
      if (!category) { return cb('Category ' + categoryToRemove + ' not found'); }

      Tldr.find({ categories: category._id }, function(err, tldrs) {
        if (err) { return cb(err); }

        async.whilst(
          function () { return i < tldrs.length; }
        , function (cb) {
            var newCategories = [];

            tldrs[i].categories.forEach(function (cat) {
              if (cat.toString() !== category._id.toString()) {
                newCategories.push(cat);
              }
            });

            tldrs[i].categories = newCategories;
            tldrs[i].save(function(err) {
              if (err) { return cb(err); }

              i += 1;
              cb();
            });
          }
        , cb);
      });
    });
  }
, function (cb) {
    Topic.findOne({ type: 'category', name: categoryToRemove }, function (err, category) {
      category.remove(function () {
        return cb();
      });
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
