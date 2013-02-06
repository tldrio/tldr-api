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
  , OpenIDStrategy = require('passport-openid').Strategy
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
    returnURL: 'http://localhost:8888/auth/google/return',
    realm: 'http://localhost:8888'
  },
  function(identifier, profile, done) {
		console.log(JSON.stringify(profile, null, 2));

		Credentials.findOne({ openID: identifier }).populate('owner').exec(function (err, gc) {
			if (err) { return done(err); }

			if (gc) {
				return done(null, gc.owner);
			} else {
				User.createAndSaveBareProfile({ username: 'bloupsic', email: 'stanislas.marion@gmail.com' }, function (err, user) {
					if (err) { console.log(err); throw err; }

					Credentials.createGoogleCredentials({ openID: identifier }, function (err, gc) {
						user.attachCredentialsToProfile(gc, function () {
							return done(null, user);
						});
					});
				});
			}
		});
  }
));


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
