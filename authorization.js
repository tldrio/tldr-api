var UserModel = require('./models').UserModel
  , bcrypt = require('bcrypt');


/*
 * Checks a user's credential and return said user if the password is valid.
 * See Passport doc to understand the signature
 * Note: this is NOT a Connect middleware, hence the different signature
 */
function authenticateUser(login, password, done) {
  console.log("Authenticating user");
  UserModel.find({ login: login }, function(err, docs) {
    if (err) { return done(err); }

    if (docs.length === 0) { return done(null, false, { message: "Unknown user" }); }

    // User was found in database, check if password is correct
    bcrypt.compare(password, docs[0].password, function(err, valid) {
      if (err) { return done(err); }

      if (valid) {
        console.log("OK - good password");
        return done(null, docs[0]);
      } else {
        console.log("NOT OK - bad password");
        return done(null, false, { message: "Invalid password" });
      }
    });
  });
}


/*
 * Serializes an authenticated user. Here, we simply store the user's _id to deserialize him later
 */
function serializeUser(user, done) {
  console.log("serialize User called");
  console.log(user);
  done(null, user._id);
};


/*
 * Deserializes an authenticated user. Here, we simply get him from the users collection
 */
function deserializeUser(_id, done) {
  console.log("DEserialize User called");
  UserModel.findOne({_id: _id}, function (err, user) {
    done(err, user);
  });
};


module.exports.authenticateUser = authenticateUser;
module.exports.serializeUser = serializeUser;
module.exports.deserializeUser = deserializeUser;
