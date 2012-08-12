/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('./lib/logger').bunyan
  , i18n = require('./lib/i18n');

/*
 * As name implies, logs user out
 */
function logout(req, res, next) {
  var username = req.user ? req.user.username : null;

  req.logOut();

  if (username) {
    return res.json(200, { message: i18n.successLogOut});
  } else {
    return res.json(400, { message: i18n.failureLogOut});
  }
}



// Module interface
exports = logout;
