/** * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../lib/logger').bunyan
  , config = require('../lib/config')
  , User = require('../lib/models').User
  , i18n = require('../lib/i18n');



function confirmUserEmail (req, res, next) {
  User.confirmEmail(req.body.email, req.body.confirmEmailToken, function (err) {
    if (err) {
      if (err.message) {
        return res.json(403, err);
      } else {
        return res.json(500, err);
      }
    }

    return res.json(200, {});
  });
}


// Module interface
module.exports = confirmUserEmail;
