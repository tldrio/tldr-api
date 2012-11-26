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
function publish (options, cb) {
  var type = options.type
    , to = options.to
    , toId = to._id || to // difference if `to` comes from a populate or not
    , from = options.from
    , tldr = options.tldr
    , data = { type: type
             , to: toId
             , from: from ? from._id : undefined
             , tldr: tldr._id
    };


  if (from && toId.toString() === from._id.toString() ) {
    return ;
  }

  // create notification object
  Notification.createAndSaveInstance(data, function (err, notif) {

    if (err) {
      if (err.errors) {
        bunyan.error('Error while saving the notification', err);
      } else if (err.code === 11000 || err.code === 11001) {// code 1100x is for duplicate key in a mongodb index
        // Nothing to do here, it just means the same notif was created twice, only keep the first one
        return;
      }
    }

    // Assign notifications to user
    User.findOne({ _id: toId }, function (err, user) {
      user.notifications.unshift(notif._id);
      user.save(cb);
    });
  });
}

module.exports.publish = publish;
