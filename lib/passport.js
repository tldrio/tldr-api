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
  , GoogleStrategy = require('passport-google-oauth2').Strategy
  , LocalStrategy = require('passport-local').Strategy
  , OAuth2Strategy = require('passport-oauth2').Strategy
  , mqClient = require('../lib/message-queue')
  ;


/**
 * Basic login / password authentication
 */
passport.use(new LocalStrategy({
      usernameField: 'email'
    , passwordField: 'password'
    , passReqToCallback: true
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
  clientID: "977953226887-t77t3heeurqlisusvh49csa928dm5jkj.apps.googleusercontent.com",
  clientSecret: "-ySOtSkJyVIP2ebWZpl3AzMX",
  callbackURL: config.websiteUrl + '/third-party-auth/google/return'
  },
  function(req, identifier, profile, done) {
		Credentials.findOne({ openID: identifier }).populate('owner').exec(function (err, gc) {
			if (err) { return done(err); }
			if (gc) { return done(null, gc.owner, { userWasJustCreated: false }); }   // We found the credentials, we're done

      // Look for an already confirmed user with a Gmail address matching the one Google gives us (modulo the subaddresses)
      console.log(profile);
      User.findOne({ email: customUtils.getSubAdressedGmails(profile.emails[0].value), confirmedEmail: true }, function (err, user) {
        if (err) { return done(err); }

        if (user) {
          // We could find a confirmed user with the same email. We create this user his google creds on the fly
          Credentials.createGoogleCredentials({ openID: identifier, googleEmail: user.email }, function (err, gc) {
            if (err) { return done(err); }
            user.attachCredentialsToProfile(gc, function () {
              return done(null, user, { userWasJustCreated: false } );
            });
          });
        } else {
          // Couldn't find a suitable user, create one on the fly
          User.signupWithGoogleSSO(identifier, profile, done);
        }
      });
		});
  }
));

passport.use(new OAuth2Strategy({
  authorizationURL: config.websiteUrl + '/oauth2/authorize',
  tokenURL: config.websiteUrl + '/oauth2/token',
  clientID: "977953226887-t77t3heeurqlisusvh49csa928dm5jkj.apps.googleusercontent.com",
  clientSecret: "-ySOtSkJyVIP2ebWZpl3AzMX",
  callbackURL: config.websiteUrl + '/third-party-auth/google/return'
  },
  function(req, identifier, profile, done) {
		Credentials.findOne({ openID: identifier }).populate('owner').exec(function (err, gc) {
			if (err) { return done(err); }
			if (gc) { return done(null, gc.owner, { userWasJustCreated: false }); }   // We found the credentials, we're done

      // Look for an already confirmed user with a Gmail address matching the one Google gives us (modulo the subaddresses)
      User.findOne({ email: customUtils.getSubAdressedGmails(profile.emails[0].value), confirmedEmail: true }, function (err, user) {
        if (err) { return done(err); }

        if (user) {
          // We could find a confirmed user with the same email. We create this user his google creds on the fly
          Credentials.createGoogleCredentials({ openID: identifier, googleEmail: user.email }, function (err, gc) {
            if (err) { return done(err); }
            user.attachCredentialsToProfile(gc, function () {
              return done(null, user, { userWasJustCreated: false } );
            });
          });
        } else {
          // Couldn't find a suitable user, create one on the fly
          User.signupWithGoogleSSO(identifier, profile, done);
        }
      });
		});
  }
));


/**
 * Our custom authenticate with Google handler that gives us some freedom
 */
passport.customAuthenticateWithGoogle = function (req, res, next) {
  passport.authenticate('google', function (err, user, info) {
    var normalRedirect = req.session.returnUrl ? req.session.returnUrl : '/discover'
      , actualRedirect = info.userWasJustCreated && !req.session.googleAuthThroughPopup ? '/third-party-auth/pick-username' : normalRedirect
      ;
    delete req.session.returnUrl;
    delete req.session.googleAuthThroughPopup;
    if (err) { return next(err); }
    if (!user) { return res.redirect(302, '/login'); }

    req.logIn(user, function (err) {
      if (err) { return next(err); }
      res.redirect(302, actualRedirect);
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
