var UserModel = require('./models').UserModel
  , bcrypt = require('bcrypt');


/*
 * Checks a user's credential and return said user if the password is valid.
 * See Passport doc to understand the signature
 * Note: this is NOT a Connect middleware, hence the different signature
 */
function authenticateUser(login, password, done) {
  console.log("AUTH CALLED");
  UserModel.find({ login: login }, function(err, docs) {
    if (err) { return done(err); }

    if (docs.length === 0) { return done(null, false, { flash: "Unknown user" }); }

    // User was found in database, check if password is correct
    bcrypt.compare(password, docs[0].password, function(err, valid) {
      if (err) { return done(err); }

      if (valid) {
        console.log("valid");
        return done(null, docs[0]);
      } else {
        console.log("non valid");
        return done(null, false, { message: "Invalid password" });
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
  UserModel.findOne({_id: _id}, function (err, user) {
    done(err, user);
  });
};


module.exports.authenticateUser = authenticateUser;
module.exports.serializeUser = serializeUser;
module.exports.deserializeUser = deserializeUser;
