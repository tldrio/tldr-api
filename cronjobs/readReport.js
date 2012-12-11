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
    , expiration = new Date().setDate(new Date().getDate() + 2); // 48h expiration


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
           , viewsThisWeek
           , viewsTotal
           , topThisWeek = {}
           , maxNotifs
           , topOfAllTime
           , values;

         if (user.notificationsSettings.read) {

           // Group by tldr read
           tldrsRead = _.groupBy(notifsByUser[user._id], function(doc) { return doc.tldr.toString();});
           // Find the most read tldr this week
           maxNotifs = _.max(tldrsRead, function(tldr) { return tldr.length;});
           topThisWeek = { _id: maxNotifs[0].tldr.toString(), readCountWeek: maxNotifs.length};

           // total notif count this week
           viewsThisWeek = notifsByUser[user._id].length;

           // This is all the tldrs from the given user
           Tldr.find({ _id: { $in: user.tldrsCreated } }, function (err, tldrs) {

             topOfAllTime = _.max(tldrs, function(tldr) { return tldr.readCount;});
             // populate top tldr of this week
             topThisWeek.tldr = _.find(tldrs, function(tldr) {return tldr._id.toString() === topThisWeek._id;});
             //total readCount for all tldrs created
             viewsTotal = _.reduce(tldrs, function(memo, tldr){ return memo + tldr.readCount; }, 0);

             values = { topThisWeek: topThisWeek
                      , topOfAllTime: topOfAllTime
                      , viewsTotal: viewsTotal
                      , viewsThisWeek: viewsThisWeek
                      , user: user
                      , signature: signature
                      , expiration: expiration};

             emailsSent += 1;
             signature = customUtils.computeSignature(user._id + '/' + expiration);
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

