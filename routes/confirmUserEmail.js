/** * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../lib/logger').bunyan
  , config = require('../lib/config')
  , User = require('../lib/models').User
  , i18n = require('../lib/i18n');



function confirmUserEmail (req, res, next) {
  var confirmEmailToken = req.body.confirmEmailToken
    , email = req.body.email;

  if (!confirmEmailToken || !email) {
    return next({ statusCode: 403, body: { message: i18n.confirmTokenOrEmailInvalid} } );
  }

  User.findOne({ email: email },  function (err, user) {
    if (err) { return next({ statusCode: 500, body: { message: i18n.mongoInternErrGetUserEmail} } ); }

    // User email is not recognised
    if (!user) {
      return next({ statusCode: 403, body: { message: i18n.confirmTokenOrEmailInvalid} } );
    }
    // If email is already confirmed send positive response
    if (user.confirmedEmail) {
      return res.json(200, {message: i18n.emailIsConfirmed});
    }

    // User email is not confirmed - token is incorrect
    if (user.confirmEmailToken !== confirmEmailToken) {
      return next({ statusCode: 403, body: { message: i18n.confirmTokenOrEmailInvalid} } );
    }

    // User email is not confirmed - token is correct -> Confirm
    var now = new Date();
    if (!user.confirmedEmail) {
      user.confirmedEmail = true;
      user.confirmEmailToken = null;
      user.save(function (err) {
        if (err) {
          return next({ statusCode: 500, body: { message: i18n.mongoInternErrSaveConfirmUser} } );
        }
        return res.json(200, {message: i18n.emailIsConfirmed});
      });
    } else {
      return res.json(200, {message: i18n.emailIsConfirmed});
    }

  });

}


// Module interface
module.exports = confirmUserEmail;
