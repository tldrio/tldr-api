/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../lib/logger').bunyan
  , _ = require('underscore')
  , config = require('../lib/config')
  , models = require('../lib/models')
  , mailer = require('../lib/mailer')
  , i18n = require('../lib/i18n');


/*
 * Updates the logged user's info except password.
 */
function updateProfile(req, res, next) {
  var link;

  if (req.user) {
    if (req.body.username || req.body.email) {

      var emailUpdate = false;
      if (req.body.email !== req.user.email) {
        emailUpdate = true;
      }

      req.user.updateValidFields(req.body, function(err, user) {
        if (err) {
          if (err.errors) {
            // Send back a 403 with all validation errors
            return next({ statusCode: 403, body: models.getAllValidationErrorsWithExplanations(err.errors) });
          } else if (err.code === 11000 || err.code === 11001) {// code 1100x is for duplicate key in a mongodb index
            return next({ statusCode: 409, body: {duplicateField: models.getDuplicateField(err)} });
          } else {
            return next({ statusCode: 500, body: { message: i18n.mongoInternErrUpdateUser} } );
          }
        }

        // We send the confirmation link email in case of email change
        if (emailUpdate) {
          // Craft the email confirmation link
          link = config.websiteUrl +
                 '/confirm?confirmEmailToken=' +
                 encodeURIComponent(user.confirmEmailToken) +
                 '&email=' +
                 encodeURIComponent(user.email);

          // Send the link by email
          mailer.sendEmail({ type: 'emailConfirmationToken'
                           , to: user.email
                           , values: { user: user, link: link }
                           });
        }

        return res.send(200, user.getAuthorizedFields());
      });
    } else {
      return res.send(200, req.user.getAuthorizedFields());
    }
  } else {
    res.setHeader('WWW-Authenticate', i18n.unknownUser);
    return res.json(401, { message: i18n.unauthorized} );
  }
}


// Module interface
module.exports = updateProfile;
