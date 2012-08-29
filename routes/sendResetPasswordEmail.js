/** * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../lib/logger').bunyan
  , config = require('../lib/config')
  , mailer = require('../lib/mailer')
  , User = require('../lib/models').User
  , i18n = require('../lib/i18n')
  , util = require('util');



function sendResetPasswordEmail (req, res, next) {

  if (! req.body || ! req.body.email || req.body.email.length === 0) {
    return next({ statusCode: 403, body: { message: i18n.noEmailProvidedForReset } });
  } else {
    User.findOne({ email: req.body.email }, function (err, user) {
      if (err) { return next({ statusCode: 500, body: { message: i18n.mongoInternErrGetTldrUrl} } ); }

      if (user === null) {
        mailer.sendWrongEmailToResetPasswordEmail(req.body.email, config.apiUrl, function (error, response) {
          if (error) {
            bunyan.warn('Error sending password reset for wrong email email');
          }
        });
      } else {
        user.createResetPasswordToken(function(err) {
          if (! err) {
            mailer.sendResetPasswordEmail(user, config.apiUrl, function(error, response) {
              if (error) {
                bunyan.warn('Error sending password reset email');
              }
            });
          }
        });
      }
    });

    // Send the same message, whether a user was found or not
    res.json(200, { message: util.format(i18n.resetPasswordEmailWasSent, req.body.email) });
  }

}


// Module interface
module.exports = sendResetPasswordEmail;
