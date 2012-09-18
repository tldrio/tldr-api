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
  var link;

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
        user.createResetPasswordToken(function(err) {
          if (! err) {
            // Send the same message, whether a user was found or not
            // Don't wait for email to be sent successfully to send the response to the client
            res.json(200, { message: util.format(i18n.resetPasswordEmailWasSent, req.body.email) });

            // Craft reset password link
            var link = config.websiteUrl +
                      '/resetPassword?resetPasswordToken=' +
                      encodeURIComponent(user.resetPasswordToken) +
                      '&email=' +
                      encodeURIComponent(user.email);

            // Send reset password email
            mailer.sendEmail({ type: 'resetPassword'
                             , to: user.email
                             , values: { link: link, user: user }
                             });
          }
        });
      }
    });
  }

}


// Module interface
module.exports = sendResetPasswordEmail;
