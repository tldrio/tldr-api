/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../lib/logger').bunyan
  , _ = require('underscore')
  , models = require('../lib/models')
  , i18n = require('../lib/i18n');


/*
 * Updates the logged user's info. First tries to update password if the request contains
 * password data, then updates the rest of the fields, and send back all errors or a success to the user
 * If there is a pbolem in updateValidFields because of duplication, send back only this error.
 * That's not the best behaviour, we should probably break this function down
 */
function updateUserInfo(req, res, next) {

  if (req.user) {
    // First, check if user wants to modify his password
    if (req.body.oldPassword || req.body.newPassword || req.body.confirmPassword) {

      if (!req.body.oldPassword) {
        return next({ statusCode: 403,  body: { oldPassword: i18n.oldPwdMismatch } } );
      }

      // New password and its confirmation should match
      if (!req.body.confirmPassword || !req.body.newPassword || req.body.newPassword !== req.body.confirmPassword) {
        return next({ statusCode: 403,  body: { newPassword: i18n.passwordNoMatch, confirmPassword: i18n.passwordNoMatch } } );
      }

      req.user.updatePassword(req.body.oldPassword, req.body.newPassword, function(err) {
        if (err) {
          return next({ statusCode:403, body: err });
        } else {
          return res.send(200, req.user.getAuthorizedFields());
        }
      });

      // Profile update
    } else if (req.body.username || req.body.email) {

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
        return res.send(200, user.getAuthorizedFields());
      });

    }
  } else {
    res.setHeader('WWW-Authenticate', i18n.unknownUser);
    return res.json(401, { message: i18n.unauthorized} );
  }
}


// Module interface
module.exports = updateUserInfo;
