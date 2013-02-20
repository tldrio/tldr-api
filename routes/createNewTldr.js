/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../lib/logger').bunyan
  , normalizeUrl = require('../lib/customUtils').normalizeUrl
  , models = require('../lib/models')
  , i18n = require('../lib/i18n')
  , helpers = require('./helpers')
  , config = require('../lib/config')
  , mailer = require('../lib/mailer')
  , _ = require('underscore')
  , mqClient = require('../lib/message-queue')
  , Tldr = models.Tldr;

/**
 * Handles POST /tldrs
 * create new tldr, as per the spec
 * http://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.6
 * oldest POST wins if there are concurrent POSTs
 *
 */

function createNewTldr (req, res, next) {
  var tldrToSend
    , url;

  if (!req.body) {
    return next({ statusCode: 400, body: { message: i18n.bodyRequired } } );
  }

  if (!req.user) {
    return next({ statusCode: 401, body: { message: i18n.needToBeLogged} } );
  }

  Tldr.createAndSaveInstance(req.body, req.user, function (err, tldr) {
    if (err) {
      if (err.errors) {
        return next({ statusCode: 403, body: models.getAllValidationErrorsWithExplanations(err.errors)} );
      } else if (err.code === 11000 || err.code === 11001) {   // code 1100x is for duplicate key in a mongodb index

        // POST on existing resource so we act as if it's an update
        url = normalizeUrl(req.body.url);
        Tldr.find({ possibleUrls: url }, function (err, docs) {
          helpers.updateCallback(err, docs, req, res, next);
        });

      } else {
        return next({ statusCode: 500, body: { message: i18n.mongoInternErrCreateTldr} } );
      }

    } else {
      mqClient.emit('tldr.created', {});
      mailer.sendEmail({ type: 'adminTldrWasCreatedOrEdited'
                       , development: false
                       , values: { user: req.user
                                 , tldr: tldr
                                 , type: 'Created'
                                 , message: req.user.isAdmin ? 'Please cockslap Charles' : 'A tldr was created' }
                       });

      // If this is the creator's first tldr, send him a congratulory email
      if (req.user.tldrsCreated.length === 1) {
        // Send congratulory email
        mailer.sendEmail({ type: 'congratulationsFirstTldr'
                         , to: req.user.email
                         , development: false
                         , values: { tldr: tldr, user: req.user }
                         });
      }

      // Get a plain object from our model, on which we can set the creator field to what populate would do
      // And send it to the client. We avoid a useless DB call here
      tldrToSend = tldr.toObject();
      tldrToSend.creator = { username: req.user.username, twitterHandle: req.user.twitterHandle };
      return res.json(201, tldrToSend);
    }
  });
}


// Module interface
module.exports = createNewTldr;
