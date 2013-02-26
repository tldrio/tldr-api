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
  , articleParsing = require('./articleParsing')
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
 * Update all analytics after a read
 */
function updateAnalyticsAfterRead (data) {

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
 * Update the array of contributors for a tldr
 */
function updateTldrEditors (data) {
  var editor = data.editor
    , tldr = data.newTldr;

  if ( tldr.creator.toString() !== editor._id.toString()) {
      Tldr.findOne({ _id: tldr._id })
        .exec(function (err, tldr) {
        tldr.editors.addToSet(editor._id);
        tldr.save();
      });
  }

}

/**
 * Notify the creator of a tldr after an edit
 */
function notifyCreatorAndAdminsAfterEdit (data) {
  var editor = data.editor
    , oldTldr = data.oldTldr
    , newTldr = data.newTldr
    , diff
    , dataForUnsubscribe;

    User.findOne({ _id: newTldr.creator })
      .exec(function (err, creator) {
      diff = customUtils.computeTldrDiff(oldTldr, newTldr);

      mailer.sendEmail({ type: 'adminTldrWasEdited'
                       , development: false
                       , values: { diffTotal: diff
                                 , editor: editor
                                 , creator: creator
                                 , tldr: newTldr
                                 }
                       });

      if ( creator._id.toString() !== editor._id.toString() &&
           creator.notificationsSettings.edit) {
        dataForUnsubscribe = customUtils.createDataForUnsubscribeLink(creator._id);
        mailer.sendEmail({ type: 'edit'
                         , development: true
                         , to: 'hello+test@tldr.io'
                         //, to: creator.email
                         , values: { diffTotal: diff
                                   , editor: editor
                                   , creator: creator
                                   , dataForUnsubscribe: dataForUnsubscribe
                                   , tldr: newTldr
                                   }
                         });
      }
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

  mailer.sendEmail({ type: 'emailConfirmationToken'
                   , development: true
                   , to: user.email
                   , values: { email: encodeURIComponent(user.email), token: encodeURIComponent(user.confirmEmailToken), user: user }
                   });

  // Try to get the given name of the new user
  request.get({ headers: {"Accept": "application/json"}
              , uri: 'https://api.fullcontact.com/v2/person.json?email='+ encodeURIComponent(user.email)+'&apiKey=9b5427a6b5542ca6' }, function (error, response, body) {

    var infos = JSON.parse(response.body)
      , givenName;

    if (infos.status === 200) {
      givenName = infos.contactInfo.givenName;
    }

    mailer.sendEmail({ type: 'adminUserCreated'
                     , development: false
                     , values: { user: user, moreUserInfos: infos}
                     });

    // Send surprising mail after 22min
    mqClient.emit('schedule', { delay: 1320, event: 'user.created.after.1hour', data: data } );

    // Send surprising mail after 22h 51 min
    mqClient.emit('schedule', { delay: 82260, event: 'user.created.after.1day', data: { id: user._id, givenName: givenName } } );
  });

}


/**
 * A few minutes after a new user was created
 * Send him the welcome email'
 */
function sendWelcomeEmail (data) {
  var user = data.user
    , source = data.source;

  switch(source) {
      case 'crx':
        mailer.sendEmail({ type: 'welcomeWithExt'
                         , development: true
                         , to: user.email
                         , values: { email: encodeURIComponent(user.email), user: user }
                         });
        break;
      case 'direct':
        mailer.sendEmail({ type: 'welcomeDirect'
                         , development: true
                         , to: user.email
                         , values: { email: encodeURIComponent(user.email), user: user }
                         });
        break;
      default:
        mailer.sendEmail({ type: 'welcomeDirect'
                         , development: true
                         , to: user.email
                         , values: { email: encodeURIComponent(user.email), user: user }
                         });
        break;
  }

}

/**
 * the day after a new user was created
 * Send him the 'surprising personal email'
 */
function sendSurprisingEmail (data) {

    User.findOne({ _id: data.id }, function (err, user ) {
    var givenName = user.firstName || data.givenName;

      // Send the personal email only if writecount is null
      if (!user.tldrsCreated.length) {
        mailer.sendEmail({ type: 'surprisingPersonalEmail'
                         , development: true
                         , from: 'stan@tldr.io'
                         , to: user.email
                         , values: { givenName: givenName }
                         });
      }
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
                     , development: false
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

  });
}

// Register event handlers
mqClient.on('tldr.read', updateTldrReadCount);
mqClient.on('tldr.read', updateTotalReadCount);

mqClient.on('tldr.edit', notifyCreatorAndAdminsAfterEdit);
mqClient.on('tldr.edit', updateTldrEditors);

mqClient.on('tldr.thank', thankContributor);

mqClient.on('forum.post', someonePostedToTheForum);

mqClient.on('user.created', userWasCreated);
mqClient.on('user.created.after.1day', sendSurprisingEmail);
mqClient.on('user.created.after.1hour', sendWelcomeEmail);
