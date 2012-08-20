/**
 * UpdatePassword
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
 * Updates the logged user's password
 */
function updatePassword(req, res, next) {

  if (req.user) {
    // First, check if user wants to modify his password
    if (req.body.oldPassword || req.body.newPassword || req.body.confirmPassword) {

      if (!req.body.oldPassword) {
        return next({ statusCode: 403,  body: { oldPassword: i18n.oldPwdMismatch } } );
      }

      // New password and its confirmation should match
      if (!req.body.confirmPassword || !req.body.newPassword || req.body.newPassword !== req.body.confirmPassword) {
        return next({ statusCode: 403,  body: { confirmPassword: i18n.passwordNoMatch } } );
      }

      req.user.updatePassword(req.body.oldPassword, req.body.newPassword, function(err) {
        if (err) {
          return next({ statusCode:403, body: err });
        } else {
          return res.send(200, req.user.getAuthorizedFields());
        }
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
module.exports = updatePassword;
