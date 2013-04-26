/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../lib/logger').bunyan
  , TldrSubscription = require('../lib/models').TldrSubscription
  , mailer = require('../lib/mailer')
  , mqClient = require('../lib/message-queue')
  , i18n = require('../lib/i18n');


function addSubscriber (req, res, next) {
  var id = req.params.id;

  if (!req.user) {
    return next({ statusCode: 401, body: { message: i18n.needToBeLogged} } );
  }

        TldrSubscription.findOne({ _id: id })
      .exec(function (err, subscription) {
    if (err) {
      return next({ statusCode: 500, body: { message: i18n.mongoInternErrUpdateTldr} } );
    }
    if (!subscription) {
      return next({ statusCode: 404 } );
    }
    subscription.addSubscriber( req.user, function (err, subscription, silent) {
      if (err) { return next(i18n.se_thanking); }
      mqClient.emit('tldr.subscribe', { subscriber: req.user, subscription: subscription });
      return res.json(200, subscription);
    });
  }) ;

}

// Module interface
module.exports = addSubscriber;
