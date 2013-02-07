/*
 * Authentication strategy
 * and declaration of serialization/deserialization methods
 * PassPort Stuffs
 */

var passport = require('passport')
  , _ = require('underscore')
	, models = require('./models')
	, User = models.User
	, Credentials = models.Credentials
  , bcrypt = require('bcrypt')
  , i18n = require('./i18n')
  , customUtils = require('./customUtils')
	, async = require('async')
  , config = require('./config')
  , GoogleStrategy = require('passport-google').Strategy
  , LocalStrategy = require('passport-local').Strategy
  ;


/**
 * Basic login / password authentication
 */
passport.use(new LocalStrategy({
      usernameField: 'email'   // Passport way of naming can't be changed ...
    , passwordField: 'password'
    , passReqToCallback: true   // Why the fuck wasn't this life-saving option NOT documented ?
    }
, function (req, email, password, done) {
		Credentials.findOne({ type: 'basic', login: customUtils.sanitizeAndNormalizeEmail(email) })
               .populate('owner')
               .exec(function (err, bc) {
			if (err) { return done(err); }

			if (! bc) {
				// www-authenticate header will be set to UnknowUser on top of 401 response
				return done(null, false, i18n.unknownUser);
			}

			// User was found in database, check if password is correct
			bcrypt.compare(password, bc.password, function(err, valid) {
				if (err) { return done(err); }

				if (valid) {
					return done(null, bc.owner);
				} else {
				// www-authenticate header will be set to InvalidPassword on top of 401 response
					return done(null, false, i18n.invalidPwd);
				}
			});
		});
  }
));


/**
 * Login with Google
 */
passport.use(new GoogleStrategy({
    returnURL: config.websiteUrl + '/third-party-auth/google/return'
  , realm: config.websiteUrl
  , passReqToCallback: true
  },
  function(req, identifier, profile, done) {
		Credentials.findOne({ openID: identifier }).populate('owner').exec(function (err, gc) {
			if (err) { return done(err); }
			if (gc) { return done(null, gc.owner, { userWasJustCreated: false }); }   // We found the credentials, we're done

			async.waterfall([
				function (cb) {   // Try to attach to an existing user, create one on the fly if not possible
					User.findOne({ email: profile.emails[0].value, confirmedEmail: true }, function (err, user) {
						if (err) { return cb(err); }
						if (user) { return cb(null, user, { userWasJustCreated: false } ); }

						// Couldn't find a suitable user, create one on the fly
						User.findAvailableUsername(profile.displayName, function (err, username) {
							User.createAndSaveBareProfile({ username: username, email: profile.emails[0].value }, function (err, user) {
								if (err) { return cb(err); }
								if (! user) { return cb({ noErrorButUserStillNotCreated: true }); }

								return cb(null, user, { userWasJustCreated: true });
							});
						});
					});
        }
			, function (user, info, cb) {   // Create the google credentials and attach them to our found/created user
					Credentials.createGoogleCredentials({ openID: identifier }, function (err, gc) {
						user.attachCredentialsToProfile(gc, function () {
							return cb(null, user, info);
						});
					});
        }
			], done);
		});
  }
));

/**
 * Our custom authenticate with Google handler that gives us some freedom
 */
passport.customAuthenticateWithGoogle = function (req, res, next) {
  passport.authenticate('google', function (err, user, info) {
    var normalRedirect = req.session.returnUrl ? req.session.returnUrl : '/latest-summaries';
    delete req.session.redirectUrl;
    if (err) { return next(err); }
    if (!user) { return res.redirect(302, '/login'); }

    req.logIn(user, function (err) {
      if (err) { return next(err); }
      res.redirect(302, info.userWasJustCreated ? '/chrome-extension' : normalRedirect);
    });
  })(req, res, next);
};


/**
 * Serialize and deserialize the user
 */
passport.serializeUser(function (user, done) {
  done(null, user._id);
});

passport.deserializeUser(function (_id, done) {
  User.findOne({_id: _id}, function (err, user) {
    done(err, user);
  });
});


module.exports = passport;
