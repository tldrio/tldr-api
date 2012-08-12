/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('./lib/logger').bunyan
  , mailer = require('./lib/mailer')
  , server = require('./serverConfig')
  , i18n = require('./lib/i18n');


function resendConfirmToken (req, res, next) {
  // User requested a new validation link
  if (req.user) {
    req.user.createConfirmToken( function (err, user) {
      if (err) {
        return next({ statusCode: 500, body: { message: i18n.mongoInternErrUpdateToken } });
      }

      if (server.get('env') === 'test') {
          return res.json(200, { message: i18n.confirmTokenSent});
      } else if (server.get('env') === 'production' || server.get('env') === 'development' ) {
        
        mailer.sendConfirmToken(user, server.get('apiUrl'), function(error, response){
          if(error){
            bunyan.warn('Error sending confirmation email', error);
          }
        });

        return res.json(200, { message: i18n.confirmTokenSent});
      }
    });
  } else {
    res.setHeader('WWW-Authenticate', i18n.unknownUser);
    return res.json(401, { message: i18n.unauthorized} );
  }
}


// Module interface
exports = resendConfirmToken;
