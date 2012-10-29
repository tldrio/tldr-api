var config = require('../lib/config')
  , bunyan = require('../lib/logger').bunyan
  , models = require('../lib/models')
  , mailer = require('../lib/mailer')
  , i18n = require('../lib/i18n')
  , DbObject = require('../lib/db')
  , _ = require('underscore')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort)
  , Notification = models.Notification
  , User = models.User
  , Tldr = models.Tldr
  , now
  , previousFlush
  , dDate = { hours: 16, minutes: 11 , seconds: 0};


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
       users.forEach(function (user, i) {
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
                              });
           });
          }
       });

     });
   });
}

db.connectToDatabase(function() {
  previousFlush = new Date();
  previousFlush.setDate( previousFlush.getDate() - 1 );
  //previousFlush.setHours(previousFlush.getHours() - 1);

  sendReadReport(previousFlush);

});

//while(true) {

  //now = new Date ();
  //if ( now.getHours() === dDate.hours
    //&& now.getMinutes() === dDate.minutes
    //&& now.getSeconds() === dDate.seconds) {
    //bunyan.info('Launching crownjob read Report');



  //}
  //console.log('current', now);
//}
