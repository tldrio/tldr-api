#! /usr/local/bin/node

var _ = require('underscore')
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
           , tldrsForReport = []
					 , newViews
					 , newViewsText
           , signature;

         if (user.notificationsSettings.read) {

           // Group by tldr read
           tldrsRead = _.groupBy(notifsByUser[user._id], function(doc) { return doc.tldr.toString();});

           // Find the tldrs
           Tldr.find({ _id: { $in: _.keys(tldrsRead) } }, function (err, tldrs) {

             // Iterate on the tldr for a given user
             tldrs.forEach(function (tldr, j) {
							 newViews = tldrsRead[tldr._id].length;
							 if (newViews === 1) {
							   newViewsText = newViews + ' more time';
							 } else {
							   newViewsText = newViews + ' more times';
							 }
               tldrsForReport.push({ newViewsText: newViewsText
																	 , tldr: tldr });
             });

             emailsSent += 1;

             signature = customUtils.computeSignature(user._id + '/' + expiration);

             mailer.sendEmail({ type: 'readReport'
                              , development: true
                              , to: config.env === 'development' ? 'hello+test@tldr.io' : user.email
                              , values: { tldrsForReport: tldrsForReport, user: user, signature: signature, expiration: expiration }
                              }, function () { callback(null); } );
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

