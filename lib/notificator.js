var config = require('./config')
  , bunyan = require('./logger').bunyan
  , models = require('./models')
  , Tldr = models.Tldr
  , mailer = require('./mailer')
  , _ = require('underscore')
  , customUtils = require('./customUtils')
  , mqClient = require('../lib/message-queue')
  , mailchimpSync = require('../lib/mailchimpSync')
  , User = models.User
  , TldrSubscription = models.TldrSubscription
  , i18n = require('./i18n')
  , globals = require('./globals')
  , request = require('request')
  , articleParsing = require('./articleParsing')
  , detectLanguage = require('./detectLanguage')
  , tldrsWithRedirectedUrls = require('./tldrsWithRedirectedUrls')
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
                         , development: false
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
    , thread = data.thread
    , toBeNotified = _.difference(thread.participants, postCreator._id);

  // Notify all participants to the thread
  User.find({ _id: { $in: toBeNotified } }, function (err, participants) {
    participants.forEach(function(participant) {
      if (participant.notificationsSettings.postForum) {
        var dataForUnsubscribe = customUtils.createDataForUnsubscribeLink(participant._id);
        mailer.sendEmail({ type: 'postToForum'
                         , development: false
                         , to: participant.email
                         , values: { dataForUnsubscribe: dataForUnsubscribe
                                   , participant: participant
                                   , post: post
                                   , thread: thread
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
                   , values: { lastPostCreator: postCreator, websiteUrl: config.websiteUrl, thread: thread, post: post }
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
        if (tldr.editors.indexOf(editor._id) === -1) {
          tldr.editors.push(editor._id);
          tldr.save();
        }
      });
  }

}

/**
 * Notify the admins after an edit
 */
function notifyAdminsAfterEdit (data) {
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

  // We sync the user with the Mailchimp list
  mailchimpSync.subscribeNewUser({ email: user.email, username: user.username });

  // Send the 'Confirmation Email' email if we need to
  if (! user.confirmedEmail) {
    mailer.sendEmail({ type: 'emailConfirmationToken'
                     , development: false
                     , to: user.email
                     , values: { email: encodeURIComponent(user.email), token: encodeURIComponent(user.confirmEmailToken), user: user }
                     });
  }

  if (config.env === 'test') { return; }   // We're not here to test their API

  // Try to get the given name of the new user
  request.get({ headers: {'Accept': 'application/json'}
              , uri: 'https://api.fullcontact.com/v2/person.json?email='+ encodeURIComponent(user.email)+'&apiKey=9b5427a6b5542ca6' }, function (error, response, body) {

    var infos, givenName;

    try {
      infos = JSON.parse(response.body);
      if (infos.status === 200) {
        givenName = infos.contactInfo.givenName;
      }
    } catch (e) {
      // No need to do anything but API shouldnt crash because of a problem in the JSON
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
                         , development: false
                         , to: user.email
                         , values: { email: encodeURIComponent(user.email), user: user }
                         });
        break;
      case 'direct':
        mailer.sendEmail({ type: 'welcomeDirect'
                         , development: false
                         , to: user.email
                         , values: { email: encodeURIComponent(user.email), user: user }
                         });
        break;
      default:
        mailer.sendEmail({ type: 'welcomeDirect'
                         , development: false
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
      if (err || !user) { return; }
      if (!user.email) { return; }

      var givenName = user.firstName || data.givenName;

        // Send the personal email only if writecount is null
        if (!user.tldrsCreated.length) {
          mailer.sendEmail({ type: 'surprisingPersonalEmail'
                           , development: false
                           , from: 'Stan Marion <stan@tldr.io>'
                           , to: user.email
                           , values: { givenName: givenName }
                           });
        }
    });
}



function thankContributor (data) {
  var tldr = data.tldr
    , thanker = data.thanker
    , dataForUnsubscribe;

  User.findOne({ _id: Tldr.getCreatorId(tldr) }, function (err, creator) {
    if (err) { return; }
    mailer.sendEmail({ type: 'adminContributorThanked'
                     , development: false
                     , values: { thanker: thanker, tldr: tldr , creator:creator}
                     });


    if (thanker._id.toString() === creator._id.toString()) {
      mailer.sendEmail({ type: 'autoThank'
                       , development: false
                       , to: creator.email
                       , values: { thanker: thanker
                         , tldr: tldr
                         , creator: creator
                       }
                       });
    } else if (creator.notificationsSettings.thank) {
      dataForUnsubscribe = customUtils.createDataForUnsubscribeLink(creator._id);
      mailer.sendEmail({ type: 'thank'
                       , development: false
                       , to: creator.email
                       , values: { thanker: thanker
                         , tldr: tldr
                         , creator:creator
                         , dataForUnsubscribe: dataForUnsubscribe
                       }
                       });
    }
  });
}

function notifySubscribers (data) {

  Tldr.findOne({ _id: data.tldrId }, function (err, tldr) {
    if (err) {
      bunyan.error('Error while finding a tldr');
      return;
    }

    TldrSubscription.findOne({ url: tldr.possibleUrls[0], fulfilled: false })
      .populate('subscribers')
      .exec( function (err, doc) {
      if (err) {
        bunyan.error('Error while finding one subscription');
        return;
      }
      if (!doc) {
        bunyan.info('Nobody was subscribed to this tl;dr or it was already fulfilled');
        return;
      }

      doc.fulfilled = true;
      doc.save();
      User.findOne({ _id: Tldr.getCreatorId(tldr) }, function (err, creator) {

        _.each(doc.subscribers, function (subscriber) {
          if (subscriber._id.toString() === Tldr.getCreatorId(tldr)) {
            return;
          }
          mailer.sendEmail({ type: 'subscriptionTldrCreated'
                           , development: true
                           //, to: subscriber.email
                           , to: 'hello+test@tldr.io'
                           , values: { subscriber: subscriber
                             , tldr: tldr
                             , creator: creator
                           }
                           });
        });

      });
    });
  });
}

function notifyAdminOfSubscription (data) {
  var subscriber = data.subscriber
    , subscription = data.subscription;

  mailer.sendEmail({ type: 'adminUserSubscribedToTldr'
                   , development: false
                   , values: { subscriber: subscriber
                             , subscription: subscription
                             }
                   });
}

mqClient.on('tldr.moderated', notifySubscribers);

mqClient.on('tldr.read', updateTldrReadCount);
mqClient.on('tldr.read', function () { globals.incrementTotalTldrReadCount(); });
mqClient.on('tldr.read', function (data) { globals.incrementTotalWordsSaved(data.tldr.articleWordCount || 275); });

mqClient.on('tldr.edit', notifyAdminsAfterEdit);
mqClient.on('tldr.edit', updateTldrEditors);

mqClient.on('tldr.thank', thankContributor);
mqClient.on('tldr.subscribe', notifyAdminOfSubscription);

mqClient.on('forum.post', someonePostedToTheForum);

mqClient.on('user.created', userWasCreated);
mqClient.on('user.created.after.1day', sendSurprisingEmail);
mqClient.on('user.created.after.1hour', sendWelcomeEmail);
