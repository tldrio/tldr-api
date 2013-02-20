var config = require('./config')
  , bunyan = require('./logger').bunyan
  , models = require('./models')
  , Tldr = models.Tldr
  , mailer = require('./mailer')
  , _ = require('underscore')
  , customUtils = require('./customUtils')
  , mqClient = require('../lib/message-queue')
  , User = models.User
  , i18n = require('./i18n')
  , app = require('../app.js')
  , request = require('request')
  ;


/**
 * Update a tldr's read count
 */
function updateTldrReadCount (data) {
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
 * Update the total read count
 */
function updateTotalReadCount () {
  app.incrementTotalTldrReadCount();
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
  var user = data.user
    , source = data.source;

  switch(source) {
      case 'chrome-ext':
        mailer.sendEmail({ type: 'welcomeWithExt'
                         , development: true
                         , to: user.email
                         , values: { email: encodeURIComponent(user.email), user: user }
                         });
        break;
      case 'direct':
      default:
        mailer.sendEmail({ type: 'welcomeDirect'
                         , development: true
                         , to: user.email
                         , values: { email: encodeURIComponent(user.email), user: user }
                         });
        break;
  }

  mailer.sendEmail({ type: 'emailConfirmationToken'
                   , development: false
                   , to: user.email
                   , values: { email: encodeURIComponent(user.email), token: encodeURIComponent(user.confirmEmailToken), user: user }
                   });

  mailer.sendEmail({ type: 'adminUserCreated'
                   , development: false
                   , values: { user: user }
                   });

  // Send surprising mail after 51 min
  mqClient.emit('schedule', { delay: 3060, event: 'user.created.after', data: user } );

}

/**
 * A few minutes/hours after a new user was created
 * Send him the 'surprising personal email'
 */
function sendSurprisingEmail (user) {
  var infos;

  // Try to get the given name of the new user
  request.get({ headers: {"Accept": "application/json"}
              , uri: 'https://api.fullcontact.com/v2/person.json?email='+ encodeURIComponent(user.email)+'&apiKey=9b5427a6b5542ca6' }, function (error, response, body) { 

    infos = JSON.parse(response.body);

    if (infos.status === 200) {
      givenName = infos.contactInfo.givenName;
    }

    mailer.sendEmail({ type: 'surprisingPersonalEmail'
                     , development: true
                     , from: 'charles@tldr.io'
                     , to: user.email
                     , values: { givenName: givenName }
                     });


  });
}


function thankContributor (data) {
  var id = data.id
    , thanker = data.thanker
    , dataForUnsubscribe;

	Tldr.findOne({ _id: id })
      .populate('creator')
      .exec(function (err, tldr) {

    mailer.sendEmail({ type: 'adminContributorThanked'
                     , values: { thanker: thanker, tldr: tldr , user:tldr.creator}
                     });


    if (thanker._id.toString() === tldr.creator._id.toString()) {
      mailer.sendEmail({ type: 'autoThank'
                       , development: true
                       , to: tldr.creator.email
                       , values: { thanker: thanker
                         , tldr: tldr
                         , user:tldr.creator
                       }
                       });
    } else if (tldr.creator.notificationsSettings.thank) {
      dataForUnsubscribe = customUtils.createDataForUnsubscribeLink(tldr.creator._id);
      mailer.sendEmail({ type: 'thank'
                       , development: true
                       , to: tldr.creator.email
                       , values: { thanker: thanker
                         , tldr: tldr
                         , user:tldr.creator
                         , dataForUnsubscribe: dataForUnsubscribe
                       }
                       });
    }

  }) ;
}

// Register event handlers
mqClient.on('tldr.read', updateTldrReadCount);
mqClient.on('tldr.read', updateTotalReadCount);
mqClient.on('tldr.thank', thankContributor);
mqClient.on('forum.post', someonePostedToTheForum);
mqClient.on('user.created', userWasCreated);
mqClient.on('user.created.after', sendSurprisingEmail);
