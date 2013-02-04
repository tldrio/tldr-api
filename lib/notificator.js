var config = require('./config')
  , bunyan = require('./logger').bunyan
  , models = require('./models')
  , Tldr = models.Tldr
  , mailer = require('./mailer')
  , _ = require('underscore')
  , customUtils = require('./customUtils')
  , mqClient = require('../lib/message-queue')()
  , User = models.User
  , i18n = require('./i18n');



function sendCongratulatoryEmail (tldr, creator) {
  if ( creator.notificationsSettings.congratsTldrViews ) {

      var dataForUnsubscribe = customUtils.createDataForUnsubscribeLink(creator._id);

      mailer.sendEmail({ type: 'congratsTldrViews'
                       , to: creator.email
                       , development: true
                       , values: { tldr: tldr
                                 , creator: creator
                                 , dataForUnsubscribe: dataForUnsubscribe}
                       });
  }
}

/**
 * Handle a new notification
 * @param {String} name type. the type of notification to send
 *
 */
function tldrWasRead (options) {
  var tldr = options.tldr;

  Tldr.update({ _id: tldr.id }, { $inc: { readCount: 1 } }, { multi: false }, function () {
    if ( tldr.readCount === config.thresholdCongratsTldrViews) {
      User.findOne({ _id: tldr.creator._id }, function (err, creator) {
        sendCongratulatoryEmail(tldr, creator);
      });
    }
  });
}

function handlePostForumNotification (options) {
  var lastPostCreator = options.from
    , post = options.post
    , topic = options.topic
    , toBeNotified = _.difference(topic.participants, lastPostCreator._id);

  User.find({ _id: { $in: toBeNotified } }, function (err, participants) {

    participants.forEach(function(participant) {
      if (participant.notificationsSettings.postForum) {
        console.log('SENDING to', participant.email);
        var dataForUnsubscribe = customUtils.createDataForUnsubscribeLink(participant._id);
        mailer.sendEmail({ type: 'postToForum'
                         , development: true
                         //, to: 'hello+test@tldr.io'
                         , to: participant.email
                         , values: { dataForUnsubscribe: dataForUnsubscribe
                                   , participant: participant
                                   , post: post
                                   , topic: topic
                                   , lastPostCreator: lastPostCreator
                                   , websiteUrl: config.websiteUrl
                                   }
                         });
      }
    });
  });

  // Send moderation email
  mailer.sendEmail({ type: 'adminPostToForum'
                   , development: false
                   , values: { lastPostCreator: lastPostCreator, websiteUrl: config.websiteUrl, topic: topic, post: post }
                   });

}

function init () {
  bunyan.info('Notificator init ok');

  mqClient.on('tldr.read', tldrWasRead);
  mqClient.on('forum.post', handlePostForumNotification);
}



module.exports.init = init;
