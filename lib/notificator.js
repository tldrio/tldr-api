var config = require('./config')
  , bunyan = require('./logger').bunyan
  , models = require('./models')
  , mailer = require('./mailer')
  , _ = require('underscore')
  , customUtils = require('./customUtils')
  , RedisQueue = require('../lib/redis-queue'), rqClient = new RedisQueue(config.redisQueue)
  , Notification = models.Notification
  , User = models.User
  , i18n = require('./i18n');



function sendCongratulatoryEmail (tldr, creator) {
  if ( creator.notificationsSettings.congratsTldrViews ) {

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
function handleReadNotification (options, cb) {
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

  //Check if the tldr's readcount reaches the threshold
  //This can happen just once
  if ( tldr.readCount === config.thresholdCongratsTldrViews) {
    User.findOne({ _id: toId }, function (err, creator) {
      sendCongratulatoryEmail(tldr, creator);
    });
  }

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
      creator.notifications.unshift(notif._id);
      creator.save(cb);
    });
  });
}

function handlePostForumNotification (options) {
  var user = options.from
    , post = options.post
    , topic = options.topic
    , toBeNotified = _.difference(topic.participants, user._id);

  User.find({ _id: { $in: toBeNotified } }, function (err, participants) {

    participants.forEach(function(participant) {
      if (participant.notificationsSettings.postForum) {
        
      }
      mailer.sendEmail({ type: 'postToForum'
                       , development: false
                       , to: 'hello+test@tldr.io'
                       //, to: participant.email
                       , values: { participant: participant, user: user, websiteUrl: config.websiteUrl, topic: topic, post: post }
                       });
    });
  });

  // Send moderation email
  mailer.sendEmail({ type: 'adminPostToForum'
                   , development: false
                   , to: 'hello+test@tldr.io'
                   , values: { user: user, websiteUrl: config.websiteUrl, topic: topic, post: post }
                   });

}

function init () {
  bunyan.info('Notificator init ok');

  rqClient.on('tldr.read', function( options ) {
    handleReadNotification(options);
  });

  rqClient.on('forum.post', function( options ) {
    handlePostForumNotification(options);
  });
}



module.exports.init = init;
module.exports.receiveNotification = handleReadNotification;
