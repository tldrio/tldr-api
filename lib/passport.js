/*
 * Authentication strategy
 * and declaration of serialization/deserialization methods
 * PassPort Stuffs
 */

var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , authorization = require('./authorization');

passport.use(new LocalStrategy({
      usernameField: 'email'   // Passport way of naming can't be changed ...
    , passwordField: 'password'
    , passReqToCallback: true   // Why the fuck wasn't this life-saving option NOT documented ?
    }
  , authorization.authenticateUser
));

passport.serializeUser(authorization.serializeUser);
passport.deserializeUser(authorization.deserializeUser);

module.exports = passport;
