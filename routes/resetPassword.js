/** * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../lib/logger').bunyan
  , mailer = require('../lib/mailer')
  , models = require('../lib/models')
  , User = models.User
  , i18n = require('../lib/i18n')
  , util = require('util');



function resetPassword (req, res, next) {
  if ( ! req.body || ! req.body.email || req.body.email.length === 0 || ! req.body.resetPasswordToken ) {
    return next({ statusCode: 403, body: { message: i18n.wrongTokenOrEmail } });
  }

  if ( ! req.body.newPassword ) {
    // If no password was given, send the 'password didn't pass validation' message
    return next({ statusCode: 403, body: { password: i18n.validateUserPwd } });
  }

  User.findOne({ email: req.body.email }, function (err, user) {
    if (err) { return next({ statusCode: 500, body: { message: i18n.mongoInternErrGetTldrUrl} } ); }
    if (user === null) { return next( { statusCode: 403, body: {message: i18n.wrongTokenOrEmail } } ); }

    // All parameters were sent to us and the email corresponds to an entry in the users database
    user.resetPassword(req.body.resetPasswordToken, req.body.newPassword, function(err) {
      if (err) {
        if (err.tokenInvalidOrExpired) {
          // No need to give too much information to a potential attacker
          return next({ statusCode: 403, body: { message: i18n.wrongTokenOrEmail } });
        } else {
          if (err.errors) {
            return next( {statusCode: 403, body: models.getAllValidationErrorsWithExplanations(err.errors) } );
          } else {
            return next( { statusCode: 500, body: { message: i18n.mongoInternErrGetTldrUrl} } );
          }
        }
      } else {
        mailer.sendEmail({ type: 'passwordWasReset'
                         , to: user.email
                         , values: { user: user }
                         });

        res.json(200, { message: i18n.passwordResetSuccessfully });
      }
    });
  });
}


// Module interface
module.exports = resetPassword;
