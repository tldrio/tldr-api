/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


var bunyan = require('../lib/logger').bunyan
  , _ = require('underscore')
  , config = require('../lib/config')
  , models = require('../lib/models')
  , mailer = require('../lib/mailer')
  , i18n = require('../lib/i18n')
	, async = require('async')
	;


/*
 * Updates the logged user's info except password.
 */
function updateProfile(req, res, next) {
  if (! req.user) {
    res.setHeader('WWW-Authenticate', i18n.unknownUser);
    return res.json(401, { message: i18n.unauthorized} );
  }

	if (!req.body.username && !req.body.email && !req.body.bio && !req.body.notificationsSettings) {
		return res.send(200, req.user.getAuthorizedFields());
	}

	async.waterfall([
    function (cb) {   // Try to update profile
			req.user.updateValidFields(req.body, function (err, user) { cb(err, user); });
    }
	, function (user, cb) {   // Try to update email
			if (req.body.email === req.user.email) { return cb(null, user); }

			req.user.updateEmail(req.body.email, function (err, user) {
				if (!err) {
					mailer.sendEmail({ type: 'emailConfirmationToken'
                           , to: user.email
                           , values: { email: encodeURIComponent(user.email), token: encodeURIComponent(user.confirmEmailToken), user: user }
                           });
				}

				return cb(err, user);
			});
     }
	], function (err, user) {
		if (err) {
			if (err.errors) {
				// Send back a 403 with all validation errors
				return next({ statusCode: 403, body: models.getAllValidationErrorsWithExplanations(err.errors) });
			} else if (err.code === 11000 || err.code === 11001) {// code 1100x is for duplicate key in a mongodb index
				return next({ statusCode: 409, body: {duplicateField: models.getDuplicateField(err)} });
			} else {
				return next({ statusCode: 500, body: { message: i18n.mongoInternErrUpdateUser} } );
			}
		} else {
			return res.send(200, user.getAuthorizedFields());
		}
	});
}


// Module interface
module.exports = updateProfile;
