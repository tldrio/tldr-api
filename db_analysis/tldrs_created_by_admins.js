/*
 * This migration was necessary once we defined the new required field 'hostname' on tldr
 * We set it to 0 for all tldrs
 * Date: 09/10/2012
 *
 */

var async = require('async')
  , _ = require('underscore')
  , models = require('../lib/models')
  , Tldr = models.Tldr
  , User = models.User
  , DbObject = require('../lib/db')
  , config = require('../lib/config')
  , customUtils = require('../lib/customUtils')
  , db = new DbObject( config.dbHost
                     , config.dbName
                     , config.dbPort
                     );


async.waterfall([
  function (cb) {
    db.connectToDatabase(function() {
      console.log('Connected');
      cb();
    });
  }

  // Add the hostname field to all tldr docs
, function (cb) {
    var admins = 0, nonAdmins = 0;

    Tldr.find({})
        .populate('creator')
        .exec(function(err, tldrs) {
          if (err) { return cb(err); }

          _.each(tldrs, function(tldr) {
            if (tldr.creator.isAdmin()) {
              admins += 1;
            } else {
              nonAdmins += 1;
            }
            console.log(tldr);
          });

          console.log("ADMINS: ", admins);
          console.log("NON ADMINS: ", nonAdmins);

          cb();
        });
  }
], function (err) {
    db.closeDatabaseConnection(function () {
      console.log('Closed connection to database');
      process.exit(0);
    });
  }
);
