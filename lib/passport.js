/*
 * Authentication strategy
 * and declaration of serialization/deserialization methods
 * PassPort Stuffs
 */

var passport = require('passport')
  , _ = require('underscore')
  , OpenIDStrategy = require('passport-openid').Strategy
  , GoogleStrategy = require('passport-google').Strategy
  , LocalStrategy = require('passport-local').Strategy
  , authorization = require('./authorization');

passport.use(new LocalStrategy({
      usernameField: 'email'   // Passport way of naming can't be changed ...
    , passwordField: 'password'
    , passReqToCallback: true   // Why the fuck wasn't this life-saving option NOT documented ?
    }
  , authorization.authenticateUser
));

passport.use(new GoogleStrategy({
    returnURL: 'http://localhost:8888/auth/google/return',
    realm: 'http://localhost:8888'
  },
  function(identifier, profile, done) {
    console.log("GOOG - " + identifier);
console.log(JSON.stringify(profile, null, 2));
    //User.findOrCreate({ openId: identifier }, function(err, user) {
      done(null, identifier);
    //});
  }
));


//passport.use(new OpenIDStrategy({
    //returnURL: 'http://localhost:8888/auth/openid/return'
  //, realm: 'http://localhost:8888/'
  //},
  //function(identifier, done) {
    //console.log("OOO " + identifier);
    //return done(err, user);
  //}
//));

passport.serializeUser(authorization.serializeUser);
passport.deserializeUser(authorization.deserializeUser);

module.exports = passport;
