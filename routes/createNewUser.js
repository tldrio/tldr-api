/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../lib/logger').bunyan
  , config = require('../lib/config')
  , i18n = require('../lib/i18n')
  , mailchimpSync = require('../lib/mailchimpSync')
  , mailer = require('../lib/mailer')
  , models = require('../lib/models')
  , User = models.User
  , mqClient = require('../lib/message-queue')
  ;


/*
 * Creates a user if valid information is entered
 */
function createNewUser(req, res, next) {
  User.createAndSaveInstance(req.body, function(err, user) {
    if (err) {
      if (err.errors) {
        return next({ statusCode: 403, body: models.getAllValidationErrorsWithExplanations(err.errors)} );
      } else if (err.code === 11000 || err.code === 11001) {// code 1100x is for duplicate key in a mongodb index
        return next({ statusCode: 409, body: { duplicateField: models.getDuplicateField(err) } } );
      } else {
        return next({ statusCode: 500, body: { message: i18n.mongoInternErrCreateUser} } );
      }
    }

    mailchimpSync.subscribeNewUser({ email: user.email, username: user.username });
    mqClient.emit('user.created', { user: user, source: req.body.source });

    // Log user in right away after his creation
    req.logIn(user, function(err) {
      if (err) { return next(err); }

      return res.json(201, user.getAuthorizedFields());
    });
  });
}


// Module interface
module.exports = createNewUser;
