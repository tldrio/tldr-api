var config = require('./config')
  , bunyan = require('./logger').bunyan
  , models = require('./models')
  , Tldr = models.Tldr
  , mailer = require('./mailer')
  , _ = require('underscore')
  , customUtils = require('./customUtils')
  , mqClient = require('../lib/message-queue')
  , User = models.User
  , i18n = require('./i18n');


/**
 * A tldr was read
 */
function tldrWasRead (data) {
  var tldr = data.tldr;

  Tldr.update({ _id: tldr.id }, { $inc: { readCount: 1, readCountThisWeek: 1 } }, { multi: false }, function () {
    // If we reach the congrats threshold, congratulate the tldr creator
    if (tldr.readCount === config.thresholdCongratsTldrViews) {
      User.findOne({ _id: tldr.creator._id }, function (err, creator) {
        var dataForUnsubscribe;
        if (! creator.notificationsSettings.congratsTldrViews) { return; }
        dataForUnsubscribe = customUtils.createDataForUnsubscribeLink(creator._id);
        mailer.sendEmail({ type: 'congratsTldrViews'
                         , to: creator.email
                         , development: true
                         , values: { tldr: tldr
                                   , creator: creator
                                   , dataForUnsubscribe: dataForUnsubscribe}
                         });
      });
    }
  });
}


/**
 * Someone posted to the forum
 */
function someonePostedToTheForum (data) {
  var postCreator = data.creator
    , post = data.post
    , topic = data.topic
    , toBeNotified = _.difference(topic.participants, postCreator._id);

  // Notify all participants to the topic
  User.find({ _id: { $in: toBeNotified } }, function (err, participants) {
    participants.forEach(function(participant) {
      if (participant.notificationsSettings.postForum) {
        var dataForUnsubscribe = customUtils.createDataForUnsubscribeLink(participant._id);
        mailer.sendEmail({ type: 'postToForum'
                         , development: true
                         , to: participant.email
                         , values: { dataForUnsubscribe: dataForUnsubscribe
                                   , participant: participant
                                   , post: post
                                   , topic: topic
                                   , lastPostCreator: postCreator
                                   , websiteUrl: config.websiteUrl
                                   }
                         });
      }
    });
  });

  // Send moderation email
  mailer.sendEmail({ type: 'adminPostToForum'
                   , development: false
                   , values: { lastPostCreator: postCreator, websiteUrl: config.websiteUrl, topic: topic, post: post }
                   });

}


/**
 * A new user was created
 * Send him a welcome email and an email confirmation email
 * Advertise creation to admins
 */
function userWasCreated (data) {
  var user = data.user;

  mailer.sendEmail({ type: 'welcome'
                   , development: true
                   , to: user.email
                   , values: { email: encodeURIComponent(user.email), user: user }
                   });

  mailer.sendEmail({ type: 'emailConfirmationToken'
                   , development: false
                   , to: user.email
                   , values: { email: encodeURIComponent(user.email), token: encodeURIComponent(user.confirmEmailToken), user: user }
                   });

  mailer.sendEmail({ type: 'adminUserCreated'
                   , development: false
                   , values: { user: user }
                   });
}



// Register event handlers
mqClient.on('tldr.read', tldrWasRead);
mqClient.on('forum.post', someonePostedToTheForum);
mqClient.on('user.created', userWasCreated);
