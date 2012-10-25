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
    , tldr = options.tldr
    , data = { type: type
             , to: to._id
             , from: from ? from._id : undefined
             , tldr: tldr._id
    };

  // we dont send email if to and from is the same user
  if (from && to._id.toString() === from._id.toString()) {
    return;
  }

  // create notification object
  Notification.createAndSaveInstance(data, function (err, notif) {

    if (err) {
      if (err.errors) {
        bunyan.error('Error while saving the notification', err);
      } else if (err.code === 11000 || err.code === 11001) {// code 1100x is for duplicate key in a mongodb index
        bunyan.warn('This notification already exists', err);
        return;
      }
    }

    // Assign notifications to user
    User.findOne({ _id: to._id }, function (err, user) {
      user.notifications.unshift(notif._id);
      user.save();
    });
  });
}

module.exports.publish = publish;
