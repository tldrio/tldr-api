var config = require('./config')
  , bunyan = require('./logger').bunyan
  , models = require('./models')
  , mailer = require('./mailer')
  , customUtils = require('./customUtils')
  , RedisQueue = require('../lib/redis-queue'), rqClient = new RedisQueue(config.redisQueue)
  , Notification = models.Notification
  , User = models.User
  , i18n = require('./i18n');


function init () {
  bunyan.info('Notificator init ok');

  rqClient.on('tldr.read', function( options ) {
    receiveNotification(options);
  });
}


function checkToSendCongratulatoryEmail (tldr, creator) {
  //Check if the tldr's readcount reaches the threshold
  //This can happen just once
  if ( tldr.readCount === config.thresholdCongratsTldrViews
      && creator.notificationsSettings.congratsTldrViews ) {

      var expiration = new Date().setDate(new Date().getDate() + config.unsubscribeExpDays) // 48h expiration
        , signature = customUtils.computeSignatureForUnsubscribeLink(creator._id + '/' + expiration);

      mailer.sendEmail({ type: 'congratsTldrViews'
                       , to: creator.email
                       //, to: 'hello+test@tldr.io'
                       , development: true
                       , values: { tldr: tldr
                                 , creator: creator
                                 , expiration: expiration
                                 , signature: signature
                                 }
                       });
  }
}

/**
 * Handle a new notification
 * @param {String} name type. the type of notification to send
 *
 */
function receiveNotification (options, cb) {
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

    // Assign notifications to creator
    User.findOne({ _id: toId }, function (err, creator) {
      checkToSendCongratulatoryEmail(tldr, creator);
      creator.notifications.unshift(notif._id);
      creator.save(cb);
    });
  });
}

module.exports.init = init;
module.exports.receiveNotification = receiveNotification;
