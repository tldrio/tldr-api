var config = require('./config')
  , bunyan = require('./logger').bunyan
  , models = require('./models')
  , mailer = require('./mailer')
  , Notification = models.Notification
  , User = models.User
  , i18n = require('./i18n');



/**
 * Send a notification
 * @param {String} name type. the type of notification to send
 *
 */
function publish (options) {
  var type = options.type
    , to = options.to
    , from = options.from
    , tldr = options.tldr;

  // we dont send email if to and from is the same user
  if (from && to.toString() === from.toString()) {
    return;
  }

  // create notification object
  Notification.createAndSaveInstance(options, function (err, notif) {

    User.findOne({ _id: to }, function (err, user) {
      user.notifications.push(notif._id);
      user.save();
      if (user.notificationsSettings[type]){
        // If notif enabled we send the email
        mailer.sendEmail({ type: 'notif' + type
                         , to: user.email
                         , development: true
                         , values: { tldrId: tldr
                                   , websiteUrl: config.websiteUrl
                                   , from: from }
                         });
      }
    });
  });



}


module.exports.publish = publish;
