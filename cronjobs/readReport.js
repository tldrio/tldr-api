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
  , Notification = models.Notification
  , customUtils = require('../lib/customUtils')
  , Tldr = models.Tldr
  , User = models.User;

h4e.setup({ extension: 'mustache'
          , baseDir: process.env.TLDR_API_DIR + '/templates'
          , toCompile: ['emails'] });

function sendReadReport (previousFlush) {
  var notifsByUser
    , userIds
    , emailsSent = 0
    , expiration = new Date().setDate(new Date().getDate() + config.unsubscribeExpDays); // 48h expiration


  Notification.find({})
   .where('createdAt').gte(previousFlush)
   .where('type').equals('read')
   .exec(function(err, docs) {
     if (err) {
       console.log('Fatal error, couldnt retrieve the docs');
       process.exit(1);
     }
     // Group Notifs by Tldr
     notifsByUser = _.groupBy(docs, function(doc) { return doc.to.toString();});
     userIds = _.keys(notifsByUser);

     // Retrieve the users conerned by notifications
     User.find({ _id: { $in: userIds } }, function (err, users) {
       async.forEach(users, function (user, callback) {
         var tldrsRead
           , signature
           , totalViewsThisWeek // total notif count this week
           , totalViewsForAllTldrs //total readCount for all tldrs created
           , topTldrThisWeek = {} // top tldr this week
           , notifsForTopTldrThisWeek // all notifs regarding the most read tldr this week
           , topTldrOfAllTime // top tldr of all time
           , values; // Object containing the values needed for templating

         if (user.notificationsSettings.read) {

           // Group by tldr read
           tldrsRead = _.groupBy(notifsByUser[user._id], function(doc) { return doc.tldr.toString();});
           // Find the most read tldr this week
           notifsForTopTldrThisWeek = _.max(tldrsRead, function(tldr) { return tldr.length;});
           topTldrThisWeek = { _id: notifsForTopTldrThisWeek[0].tldr.toString(), readCountWeek: notifsForTopTldrThisWeek.length};

           // total notif count this week
           totalViewsThisWeek = notifsByUser[user._id].length;

           // This is all the tldrs from the given user
           Tldr.find({ _id: { $in: user.tldrsCreated } }, function (err, tldrs) {

             topTldrOfAllTime = _.max(tldrs, function(tldr) { return tldr.readCount;});
             // populate top tldr of this week
             topTldrThisWeek.tldr = _.find(tldrs, function(tldr) {return tldr._id.toString() === topTldrThisWeek._id;});
             //total readCount for all tldrs created
             totalViewsForAllTldrs = _.reduce(tldrs, function(memo, tldr){ return memo + tldr.readCount; }, 0);

             values = { topTldrThisWeek: topTldrThisWeek
                      , topTldrOfAllTime: topTldrOfAllTime
                      , totalViewsForAllTldrs: totalViewsForAllTldrs
                      , totalViewsThisWeek: totalViewsThisWeek
                      , user: user
                      , signature: signature
                      , expiration: expiration};

             emailsSent += 1;
             signature = customUtils.computeSignatureForUnsubscribeLink(user._id + '/' + expiration);
             mailer.sendEmail({ type: 'readReport'
                              , development: true
                              , values: values
                              , to: config.env === 'development' ? 'hello+test@tldr.io' : user.email
                              }, function () {
                                bunyan.info('Report sent to ' + user.email);
                                callback(null);
                              } );
           });
          } else {
            callback(null);
          }
       }, function (err) {
				 if (err) {
					 bunyan.err('Error executing ReadReport');
					 process.exit(1);
				 }

				 bunyan.info('ReadReport successfully executed. '+ emailsSent + ' emails sent');
				 process.exit(0);
			 });

     });
   });
}

db.connectToDatabase(function() {
  previousFlush = new Date();
	// We send the report for the notifs of the past 7 days
  previousFlush.setDate( previousFlush.getDate() - 7 );
  sendReadReport(previousFlush);
});

