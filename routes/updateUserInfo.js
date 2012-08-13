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
  // To be called after a password update, if any
  function updateEverythingExceptPassword(errors) {
    var errorsFromPasswordUpdate = errors || {};

    req.user.updateValidFields(req.body, function(err, user) {
      if (err) {
        if (err.errors) {
          // Send back a 403 with all validation errors
          return next({ statusCode: 403, body: _.extend(models.getAllValidationErrorsWithExplanations(err.errors), errorsFromPasswordUpdate) });
        } else if (err.code === 11000 || err.code === 11001) {// code 1100x is for duplicate key in a mongodb index
          return next({ statusCode: 409, body: {duplicateField: models.getDuplicateField(err)} });
        } else {
          return next({ statusCode: 500, body: { message: i18n.mongoInternErrUpdateUser} } );
        }
      }

      // If we have errors on password
      if (errors) {
        return next({ statusCode:403, body: errors });
      } else {
        return res.send(200, user.getAuthorizedFields());
      }
    });
  }

  if (req.user) {
    // First, check if user wants to modify username and password
    if (req.body.currentPassword && req.body.newPassword) {
      req.user.updatePassword(req.body.currentPassword, req.body.newPassword, function(err) {
        updateEverythingExceptPassword(err);   // We pass any error that we got from password update
      });
    } else {
      updateEverythingExceptPassword();   // No errors (yet)
    }
  } else {
    res.setHeader('WWW-Authenticate', i18n.unknownUser);
    return res.json(401, { message: i18n.unauthorized} );
  }
}


// Module interface
module.exports = updateUserInfo;
