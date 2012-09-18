/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../lib/logger').bunyan
  , mailer = require('../lib/mailer')
  , config = require('../lib/config')
  , i18n = require('../lib/i18n');


function resendConfirmToken (req, res, next) {
  var link;

  bunyan.incrementMetric('users.confirmEmail.resendToken.routeCalled');

  // User requested a new validation link
  if (req.user) {
    req.user.createConfirmToken( function (err, user) {
      if (err) {
        return next({ statusCode: 500, body: { message: i18n.mongoInternErrUpdateToken } });
      }

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

      return res.json(200, { message: i18n.confirmEmailTokenSent});
    });
  } else {
    res.setHeader('WWW-Authenticate', i18n.unknownUser);
    return res.json(401, { message: i18n.unauthorized} );
  }
}


// Module interface
module.exports = resendConfirmToken;
