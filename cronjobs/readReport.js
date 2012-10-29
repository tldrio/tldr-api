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
  , Tldr = models.Tldr
  , User = models.User;


function sendReadReport (previousFlush) {
  var notifsByUser
    , userIds;

  Notification.find({})
   .where('createdAt').gte(previousFlush)
   .where('type').equals('read')
   .exec(function(err, docs) {
     if (err) {
       console.log('Error Fatal');
       process.exit(1);
     }
     // Group Notifs by Tldr
     notifsByUser = _.groupBy(docs, function(doc) { return doc.to.toString();});
     userIds = _.keys(notifsByUser);

     // Retrieve the users conerned by notifications
     User.find({ _id: { $in: userIds } }, function (err, users) {
       async.forEach(users, function (user, callback) {
         var tldrsRead
           , tldrsForReport = [];
         if (user.notificationsSettings.read) {

           // Group by tldr read
           tldrsRead = _.groupBy(notifsByUser[user._id], function(doc) { return doc.tldr.toString();});

           // Find the tldrs
           Tldr.find({ _id: { $in: _.keys(tldrsRead) } }, function (err, tldrs) {

             // Iterate on the tldr for a given user
             tldrs.forEach(function (tldr, j) {
               tldrsForReport.push({ readCount: tldrsRead[tldr._id].length, tldrTitle: tldr.title, tldrId: tldr._id });
             });

             mailer.sendEmail({ type: 'readReport'
                              , development: true
                              , to: 'hello+test@tldr.io'
                              //, to: user.email
                              , values: { tldrsForReport: tldrsForReport, user: user }
                              }, function () { callback(null); } );
           });
          }
       }, function (err) {
				 if (err) {
					 bunyan.err('Error executing ReadReport');
					 process.exit(1);
				 }

				 bunyan.info('ReadReport successfully executed');
				 process.exit(0);
			 });

     });
   });
}

db.connectToDatabase(function() {
  previousFlush = new Date();
	// We send the report for the notifs of the past day
  previousFlush.setDate( previousFlush.getDate() - 1 );
  sendReadReport(previousFlush);
});

