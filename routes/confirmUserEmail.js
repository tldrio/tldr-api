/** * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../lib/logger').bunyan
  , config = require('../lib/config')
  , User = require('../lib/models').User
  , i18n = require('../lib/i18n');



function confirmUserEmail (req, res, next) {
  
  var confirmToken = req.query.confirmToken
    , email = req.query.email;

  if (!confirmToken || !email) {
    return res.render('confirmEmailError', { websiteUrl: config.websiteUrl }, function (err, html) {
        res.send(400, html);
    });
  }

  User.findOne({ email: email },  function (err, user) {
    if (err) {
      return next({ statusCode: 500, body: { message: i18n.mongoInternErrGetUserEmail} } );
    }

    // Check if user exists and confirmToken matches
    if (!user || (user.confirmToken !== confirmToken)) {
      return res.render('confirmEmailError', { websiteUrl: config.websiteUrl }, function (err, html) {
        res.send(400, html);
      });
    }

    var now = new Date();
    if (!user.confirmedEmail) {
      user.confirmedEmail = true;
      user.save(function (err) {
        if (err) {
          return next({ statusCode: 500, body: { message: i18n.mongoInternErrSaveConfirmUser} } );
        }
        return res.redirect(config.websiteUrl);
      });
    } else {
      return res.redirect(config.websiteUrl);
    }

  });

}


// Module interface
module.exports = confirmUserEmail;
