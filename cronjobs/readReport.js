#! /usr/local/bin/node

var _ = require('underscore')
  , h4e = require('h4e')
  , async = require('async')
  , bunyan = require('../lib/logger').bunyan
  , config = require('../lib/config')
  , DbObject = require('../lib/db')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort)
  , i18n = require('../lib/i18n')
  , models = require('../lib/models')
  , mailer = require('../lib/mailer')
  , customUtils = require('../lib/customUtils')
  , analytics = require('../lib/analytics')
  , Tldr = models.Tldr
  , User = models.User
  , thresholdSendMail = 20   // Don't send email with ridiculously low amounts
  ;

h4e.setup({ extension: 'mustache'
          , baseDir: process.env.TLDR_API_DIR + '/templates'
          , toCompile: ['emails'] });

function sendReadReport (cb) {
  User.find({})
      .populate('tldrsCreated')
      .exec(function (err, users) {
    var i = 0;

    async.each(
      users
    , function (user, _cb) {
        if (user.tldrsCreated.length === 0) {
          console.log('no tldrs created for', user.username);
          return _cb();
        }
        var bestTldrThisWeek = _.max( user.tldrsCreated, function (_tldr) { return _tldr.readCountThisWeek; } ) ;
        if (bestTldrThisWeek.readCountThisWeek < thresholdSendMail) { 
          console.log('no enough read count for', user.username);
          return _cb(); 
        }   // Read counts are too low, this is ridiculous

        console.log('Will send to', user.username);

        analytics.getAnalyticsForUser( user, 7 , function (analyticsValues) {

          values = { bestTldrThisWeek: bestTldrThisWeek
                   , user: user
                   , dataForUnsubscribe: customUtils.createDataForUnsubscribeLink(user._id)
                   , analytics: analyticsValues.allTime
                   };

          mailer.sendReadReport({ development: true
                           , values: values
                           , to: config.env === 'development' ? 'hello+test@tldr.io' : user.email
                           }, _cb)
        });
      }
    , function (err) {
      if (err) {
        console.log('ERROR while sending Readreport', err);
      }
      cb(err);
    });
  });
}

function resetWeeklyReadCount(cb) {
  Tldr.find({}, function (err, tldrs) {
    var i = 0;
    async.whilst(
      function () { return i < tldrs.length; }
    , function (_cb) {
        //tldrs[i].readCountThisWeek = 0;
        tldrs[i].save(function () {
          i += 1;
          _cb();
        });
      }
    , cb);
  });
}

db.connectToDatabase(function() {
  async.waterfall([
    sendReadReport
  , resetWeeklyReadCount
  ],function () { process.exit(0); });
});

