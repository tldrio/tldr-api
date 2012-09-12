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
  , mailer = require('../lib/mailer')
  , _ = require('underscore')
  , Tldr = models.Tldr;

/**
 * Handles POST /tldrs
 * create new tldr, as per the spec
 * http://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.6
 * oldest POST wins if there are concurrent POSTs
 *
 */

function createNewTldr (req, res, next) {

  if (!req.body) {
    return next({ statusCode: 400, body: { message: i18n.bodyRequired } } );
  }

  Tldr.createAndSaveInstance(req.body, function (err, tldr) {
    if (err) {
      if (err.errors) {
        return next({ statusCode: 403, body: models.getAllValidationErrorsWithExplanations(err.errors)} );
      } else if (err.code === 11000 || err.code === 11001) {// code 1100x is for duplicate key in a mongodb index

        // POST on existing resource so we act as if it's an update
        var url = normalizeUrl(req.body.url);
        Tldr.find({url: url}, function (err, docs) {
          helpers.updateCallback(err, docs, req, res, next);
        });

      } else {
        return next({ statusCode: 500, body: { message: i18n.mongoInternErrCreateTldr} } );
      }

    } else {

      mailer.advertiseAdminTldr(tldr, req.user, function(error, response){
        if(error){
          bunyan.warn('Error sending new tldr by email to admins', error);
        }
      });
      // If a user is logged, he gets to be the tldr's creator
      if (req.user) {
        models.setTldrCreator(tldr, req.user , function() {
          // Populate creator username
          Tldr.findOne({_id: tldr.id})
            .populate('creator', 'username')
            .exec( function (err, tldr) {
              return res.json(201, tldr);
          });
        });
      } else {
        return res.json(201, tldr);
      }
    }
  });
}


// Module interface
module.exports = createNewTldr;
