
/*
 * Get the names email addresses of our active users
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
  , moment = require('moment')
  , db = new DbObject( config.dbHost
                     , config.dbName
                     , config.dbPort
                     )
  , weeks = []
  ;

for (var i = 0; i<52; i++) {
  weeks.push(i);
}

var getShitDone = function (week, cb) {
  var isoWeek = moment().isoWeek(week)
    , line = ''
    ;
  line += isoWeek.format('MMM DD YYYY');
  User.find({ createdAt: { $lt: isoWeek } }, function (err, users) {
    line = line + ' ' + users.length;
    Tldr.find({ createdAt: { $lt: isoWeek } }, function (err, tldrs) {
      line = line + ' ' + tldrs.length;
      console.log(line);
      cb();
    });
  });
};

async.waterfall([
  // Connect to db
  function (cb) {
    db.connectToDatabase(function() {
      console.log('Connected');
      cb();
    });
  }

  // Get the active contributors
, function (cb) {
    async.eachSeries(weeks, getShitDone, cb);
  }
], function (err) {
    db.closeDatabaseConnection(function () {
      console.log('Closed connection to database');
      process.exit(0);
    });
  }
);
