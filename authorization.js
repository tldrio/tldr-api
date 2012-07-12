var User = require('./models').User
  , bcrypt = require('bcrypt');


/*
 * Checks a user's credential and return said user if the password is valid.
 * See Passport doc to understand the signature
 * Note: this is NOT a Connect middleware, hence the different signature
 */
function authenticateUser(req, email, password, done) {
  User.find({ email: email }, function(err, docs) {
    if (err) { return done(err); }

    if (docs.length === 0) {
      req.authFailedDueToUnknownUser = true;    // Enables us to tell the client what didn't work
      return done(null, false);
    }

    // User was found in database, check if password is correct
    bcrypt.compare(password, docs[0].password, function(err, valid) {
      if (err) { return done(err); }

      if (valid) {
        return done(null, docs[0]);
      } else {
        req.authFailedDueToInvalidPassword = true;    // Enables us to tell the client what didn't work
        return done(null, false);
      }
    });
  });
}



/*
 * Serializes an authenticated user. Here, we simply store the user's _id to deserialize him later
 */
function serializeUser(user, done) {
  done(null, user._id);
};


/*
 * Deserializes an authenticated user. Here, we simply get him from the users collection
 */
function deserializeUser(_id, done) {
  User.findOne({_id: _id}, function (err, user) {
    done(err, user);
  });
};


module.exports.authenticateUser = authenticateUser;
module.exports.serializeUser = serializeUser;
module.exports.deserializeUser = deserializeUser;
