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
    users.forEach(function(user) {
      var totalReadCountThisWeek = _.reduce( _.map(user.tldrsCreated, function (_tldr) { return _tldr.readCountThisWeek; })
                                           , function (memo, n) { return memo + n; }
                                           , 0)
        , totalReadCount = _.reduce( _.map(user.tldrsCreated, function (_tldr) { return _tldr.readCount; })
                                   , function (memo, n) { return memo + n; }
                                   , 0)
        , bestTldrThisWeek = _.max( user.tldrsCreated, function (_tldr) { return _tldr.readCountThisWeek; } )
        , bestTldr = _.max( user.tldrsCreated, function (_tldr) { return _tldr.readCount; } )
        ;

      if (bestTldrThisWeek.readCountThisWeek < thresholdSendMail) { return; }   // Read counts are too low, this is ridiculous

      values = { totalReadCountThisWeek: totalReadCountThisWeek
               , totalReadCount: totalReadCount
               , bestTldrThisWeek: bestTldrThisWeek
               , bestTldr: bestTldr
               , user: user
               , dataForUnsubscribe: customUtils.createDataForUnsubscribeLink(user._id)
               };

      mailer.sendEmail({ type: 'readReport'
                       , development: true
                       , values: values
                       , to: config.env === 'development' ? 'hello+test@tldr.io' : user.email
                       })

                       console.log("===========");
    });

    cb();
  });
}

function resetWeeklyReadCount(cb) {
  Tldr.find({}, function (err, tldrs) {
    var i = 0;
    async.whilst(
      function () { return i < tldrs.length; }
    , function (_cb) {
        tldrs[i].readCountThisWeek = 0;
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
  ],function () { process.exit(0); });
});

