/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var i18n = require('../lib/i18n')
  , models = require('../lib/models')
  , _ = require('underscore')
  , config = require('../lib/config')
  , bunyan = require('../lib/logger').bunyan
  , mailer = require('../lib/mailer')
  , mqClient = require('../lib/message-queue')
  ;


/**
 * Convenience function to factor code betweet PUT and POST on
 * already existing tldr
 *
 */

function updateCallback (err, docs, req, res, next) {

  var oldTldr
    , oldTldrAttributes
    , tldrToSend;

  if (err) {
    if (err.message === 'Invalid ObjectId') {
      return next({ statusCode: 403, body: { _id: i18n.invalidId} } );
    } else {
      return next({ statusCode: 500, body: { message: i18n.mongoInternErrGetTldrUrl} } );
    }
  }

  if (docs.length === 1) {
    oldTldr = docs[0];
    oldTldrAttributes = {summaryBullets: oldTldr.summaryBullets, title: oldTldr.title };

    oldTldr.updateValidFields(req.body, req.user, function (err, updatedTldr) {
      if (err) {
        if (err.errors) {
          return next({ statusCode: 403, body: models.getAllValidationErrorsWithExplanations(err.errors)} );
        }
        return next({ statusCode: 500, body: { message: i18n.mongoInternErrUpdateTldr} } );
      }

      mqClient.emit('tldr.edit', { editor: req.user, oldTldr: oldTldrAttributes, newTldr: updatedTldr });

      tldrToSend = oldTldr.toObject();
      tldrToSend.lastEditor = { username: req.user.username };
      delete tldrToSend.creator; // we delete the creator entry which is not populated otherwise client side it will mess up the model
      return res.send(200, tldrToSend);
    });
  } else {
    return next({ statusCode: 404, body: { message: i18n.resourceNotFound} } );
  }
}

// Module interface
module.exports.updateCallback = updateCallback;
