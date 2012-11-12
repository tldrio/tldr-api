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
  , User = models.User;


/*
 * Subscribe email address gathered during a launch
 */
function subscribeEmailAddress(req, res, next) {
  var body = req.body;
  mailchimpSync.subscribeNewUser({ email: body.email, username: body.email, groups: body.groups });

  return res.send(200);
}


// Module interface
module.exports = subscribeEmailAddress;
