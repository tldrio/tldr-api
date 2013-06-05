/** * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../lib/logger').bunyan
  , mailer = require('../lib/mailer')
  , User = require('../lib/models').User
  , config = require('../lib/config')
  , i18n = require('../lib/i18n')
  , util = require('util');



function sendResetPasswordEmail (req, res, next) {
  if (! req.body || ! req.body.email || req.body.email.length === 0) {
    return next({ statusCode: 403, body: { message: i18n.noEmailProvidedForReset } });
  } else {
    User.findOne({ email: req.body.email }, function (err, user) {
      if (err) { return next({ statusCode: 500, body: { message: i18n.mongoInternErrGetTldrUrl} } ); }

      if (user === null) {
        // Send the same message, whether a user was found or not
        // Don't wait for email to be sent successfully to send the response to the client
        res.json(200, { message: util.format(i18n.resetPasswordEmailWasSent, req.body.email) });

        mailer.sendEmail({ type: 'userDoesntExistButTriedToResetPassword'
                         , to: req.body.email
                         , values: {}
                         });
      } else {
        user.createResetPasswordToken(function(err, bc) {
          if (err) { return res.json(500, err); }

          // Send the same message, whether a user was found or not
          // Don't wait for email to be sent successfully to send the response to the client
          res.json(200, { message: util.format(i18n.resetPasswordEmailWasSent, req.body.email) });

          // Send reset password email
          mailer.sendEmail({ type: 'resetPassword'
                           , to: user.email
                           , values: { user: user, email: encodeURIComponent(user.email), token: encodeURIComponent(bc.resetPasswordToken) }
                           });
        });
      }
    });
  }
}


// Module interface
module.exports = sendResetPasswordEmail;
