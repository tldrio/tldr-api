/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  , _ = require('underscore')
  , i18n = require('../lib/i18n')
  , mailchimpSync = require('../lib/mailchimpSync')
  , UserSchema, User
  , UserHistory = require('./userHistoryModel')
  , Credentials = require('./credentialsModel')
  , bcrypt = require('bcrypt')
  , crypto = require('crypto')
  , config = require('../lib/config')
  , customUtils = require('../lib/customUtils')
  , Tldr = require('./tldrModel')
  , check = require('validator').check
  , userSetableFields = ['email', 'username', 'password', 'twitterHandle']      // Setable fields by user at creation
  , userUpdatableFields = ['username', 'notificationsSettings', 'bio', 'twitterHandle']                // Updatabe fields by user (password not included here as it is a special case)
  , authorizedFields = ['email', 'username', 'confirmedEmail', '_id', 'notificationsSettings', 'gravatar', 'bio', 'twitterHandle', 'tldrsCreated']         // Fields that can be sent to the user
  , reservedUsernames
  , async = require('async')
  ;


// All reserved usernames. For now these are all the one-step
// routes for the API and the website
// All names sould be lowercased here
reservedUsernames = {
    'about': true
  , 'account': true
  , 'chromeextension': true
  , 'confirm': true
  , 'confirmemail': true
  , 'crx': true
  , 'extension': true
  , 'forgotpassword': true
  , 'index': true
  , 'login': true
  , 'logout': true
  , 'moderation': true
  , 'notifications': true
  , 'resendconfirmtoken': true   // Useless due to the 16-chars max rule but lets keep it anyway, the rule may change
  , 'resetpassword': true
  , 'signup': true
  , 'sitemaps': true
  , 'summaries': true
  , 'tldrs': true
  , 'tldrscreated': true
  , 'forum': true
  , 'users': true
  , 'whatisit': true
};




/*
 * Validators
 */

// Email regex comes from node-validator and can be used by clients
function validateEmail (value) {
  try {
    check(value).isEmail();
    return true;
  } catch(e) {
    return false;
  }
}

// Username should contain from 3 to 16 alphanumerical characters
function validateUsername (value) {
  try {
    check(value).is(/^[A-Za-z0-9_]{3,16}$/);
    return true;
  } catch(e) {
    return false;
  }
}


// Validates that the given username is not reserved
function usernameNotReserved (value) {
  if ( value && ! reservedUsernames[value.toLowerCase()] ) {
    return true;
  } else {
    return false;
  }
}


// bio should be less than 500 characters
function validateBio (value) {
  if (! value || value.length <= 500) {
    return true;
  } else {
    return false;
  }
}


// Twitter handle should be null or less than 15 characters
function validateTwitterHandle (value) {
  if (! value || value.length <= 15) {
    return true;
  } else {
    return false;
  }
}


/*
 * Specific setters
 */
function setTwitterHandle (value) {
  var handle = customUtils.sanitizeInput(value);

  handle = handle.replace(/@/g, '');

  return handle;
}


/**
 * Schema
 *
 */
UserSchema = new Schema(
  { confirmedEmail: { type: Boolean
                    , default: false
                    }
  , confirmEmailToken: { type: String
                  }
  , createdAt: { type: Date
               , default: Date.now
               }
  , email: { type: String   // Should be the user's email. Not defined as a Mongoose type email to be able to use the same regex on client side easily
           , required: true
           , validate: [validateEmail, i18n.validateUserEmail]
           , set: customUtils.sanitizeAndNormalizeEmail
           }
  , lastActive: { type: Date
                , default: Date.now
                }
  , notificationsSettings: { read: { type: Boolean, default: true}
                           , congratsTldrViews: { type: Boolean, default: true}
                           , postForum: { type: Boolean, default: true}
                           , newsletter: { type: Boolean, default: true}
                           , serviceUpdates: { type: Boolean, default: true}
                           }
  , notifications: [{ type: ObjectId, ref: 'notification' }]
  , tldrsCreated: [{ type: ObjectId, ref: 'tldr' }]
  , username: { type: String
              , required: true
              // Validation is done below because we need two different validators
              , set: customUtils.sanitizeInput
              }
  , updatedAt: { type: Date
               , default: Date.now
               }
  , usernameLowerCased: { type: String
                        , required: true
                        , unique: true
                        , set: customUtils.sanitizeInput
                        }
  , history: { type: ObjectId, ref: 'userHistory', required: true }
  , gravatar: { email: { type: String
                       , set: customUtils.sanitizeAndNormalizeEmail }
              , url: { type: String }
              }
  , bio: { type: String
         , validate: [validateBio, i18n.validateUserBio]
         , set: customUtils.sanitizeInput}
  , twitterHandle: { type: String
                   , validate: [validateTwitterHandle, i18n.validateTwitterHandle]
                   , set: setTwitterHandle }
  , credentials: [{ type: ObjectId, ref: 'credentials' }]
  }
, { strict: true });

/** Keep a virtual 'isAdmin' attribute
 *  isAdmin is true when user is an admin, false otherwise (of course ...)
 */
UserSchema.virtual('isAdmin').get(function () {
  var adminEmails = { "louis.chatriot@gmail.com": true , "louis.chatrio.t@gmail.com": true , "lo.uis.chatriot@gmail.com": true , "louis.cha.triot@gmail.com": true , "loui.s.chatriot@gmail.com": true , "l.ouis.chatriot@gmail.com": true
                    , "charles.miglietti@gmail.com": true , "charles@tldr.io": true , "charles@needforair.com": true , "c.harlesmiglietti@gmail.com": true , "ch.arlesmiglietti@gmail.com": true , "cha.rlesmiglietti@gmail.com": true
                    , "char.lesmiglietti@gmail.com": true , "charl.esmiglietti@gmail.com": true , "charle.smiglietti@gmail.com": true , "charlesm.iglietti@gmail.com": true , "charlesmi.glietti@gmail.com": true , "c.harles.miglietti@gmail.com": true
                    , "ch.arles.miglietti@gmail.com": true , "cha.rles.miglietti@gmail.com": true , "char.les.miglietti@gmail.com": true , "charle.s.miglietti@gmail.com": true , "stanislas.marion@gmail.com": true , "stan@tldr.io": true
                    , "s.tanislas.marion@gmail.com": true , "st.anislas.marion@gmail.com": true , "sta.nislas.marion@gmail.com": true , "stan.islas.marion@gmail.com": true };

  return adminEmails[this.email] ? true : false;
});

// Send virtual attributes along with real ones
UserSchema.set('toJSON', {
   virtuals: true
});

// Validate username
UserSchema.path('username').validate(validateUsername, i18n.validateUserName);
UserSchema.path('username').validate(usernameNotReserved, i18n.validateUserNameNotReserved);



/**
 * Statics and Methods
 *
 */

UserSchema.methods.createConfirmToken = function (callback) {
  var newToken = customUtils.uid(13);

  User.findOne({ email: this.email }, function (err, doc) {

    doc.confirmEmailToken = newToken;
    doc.save(callback);
  });
};


/*
 * Prepare to reset password by creating a reset password token and sending it to the user
 */
UserSchema.methods.createResetPasswordToken = function (callback) {
  this.getBasicCredentials(function (err, bc) {
    if (err) { return callback(err); }
    if (! bc) { return callback({ noBasicCredentials: true }); }

    bc.createResetPasswordToken(callback);
  });
};


/*
 * Reset password if token is corrected and not expired
 */
UserSchema.methods.resetPassword = function (token, newPassword, callback) {
  this.getBasicCredentials(function (err, bc) {
    if (err) { return callback(err); }
    if (! bc) { return callback({ noBasicCredentials: true }); }

    bc.resetPassword(token, newPassword, callback);
  });
};


/*
 * Return the part of a user's data that we may need to use in a client
 */
UserSchema.methods.getAuthorizedFields = function () {
  // this is the selected User, so this._doc contains the actual data
  var usableKeys = _.intersection(_.keys(this._doc), authorizedFields)
    , res = {}, self = this;

    usableKeys.push('isAdmin');   // isAdmin was not included since it's a virtual

  _.each( usableKeys, function (key) {
    res[key] = self[key];
  });

  return res;
};


/**
 * Get all tldrs created by the user
 * @param {Function} callback Signature: err, [tldrs]
 */
UserSchema.methods.getCreatedTldrs = function (callback) {
  Tldr.find({'creator': this._id})
    .sort('url')
    .populate('creator', 'username')
    .exec(function(err, tldrs) {
      if (err) { return callback(err); }
      callback(null, tldrs);
    });
};


/*
 * Update lastActive field
 */
UserSchema.methods.updateLastActive = function (callback) {
  this.lastActive = new Date ();
  this.save(function () {
    callback();
  });
};


/**
 * Update a profile's email.
 * Do it only if email is not already taken by a basic cred
 * And update the corresponding basic cred if user has one
 * Callback signature: err, user
 */
UserSchema.methods.updateEmail = function (newEmail, callback) {
  var self = this;

  Credentials.findOne({ login: newEmail }, function (err, bc) {
    if (err) { return callback(err); }
    if (bc) { return callback({ code: 11001, conflictingCredentials: bc }); }

    self.email = newEmail;
    self.save(function (err, user) {
      if (err) { return callback(err); }

      user.getBasicCredentials(function (err, bc) {
        if (err) { return callback(err); }

        if (!bc) { return callback(null, user); }

        bc.login = newEmail;
        bc.save(function (err) {
          if (err) { return callback(err); }
          return callback(null, user);
        });
      });
    });
  });
};


/*
 * Update a user profile
 * The profile doesn't include the password (if user has basic creds) or email address
 * Callback signature: err, user
 */
UserSchema.methods.updateValidFields = function (data, callback) {
  var self = this
    , validUpdateFields = _.intersection(_.keys(data), userUpdatableFields);

  // Manually set usernameLowerCased in case of updates
  if (self.username !== data.username) {
    self.usernameLowerCased = data.username.toLowerCase();
  }

  // Update profile info on Mailchimp
  mailchimpSync.syncSettings(self, data);

  _.each(validUpdateFields, function(field) { self[field] = data[field]; });
  self.updatedAt = new Date();

  self.save(callback);
};


/*
 * Prepare a bare profile
 */
function prepareBareProfile (userInput) {
  var validFields = _.pick(userInput, userSetableFields)
    , instance;

  // Prepare the profile
  validFields.confirmedEmail = false;
  validFields.confirmEmailToken = customUtils.uid(13);
  validFields.usernameLowerCased = validFields.username.toLowerCase();
  instance = new User(validFields);
  instance.history = '111111111111111111111111';   // Dummy
  instance.gravatar = { email: instance.email
                      , url: customUtils.getGravatarUrlFromEmail(instance.email) };

  return instance;
}


/*
 * Create and save a bare profile, with no credentials attached
 */
UserSchema.statics.createAndSaveBareProfile = function (userInput, callback) {
  var instance = prepareBareProfile(userInput)
    , history = new UserHistory();

  instance.validate(function (err) {
    if (err) { return callback(err); }

    history.saveAction("accountCreation", "Account was created", function(err, _history) {
      instance.history = _history._id;
      instance.save(callback);
    });
  });
};


/*
 * Create a User instance and save it to the database
 * Create his basic credentials at the same time and attach them to him
 */
UserSchema.statics.createAndSaveInstance = function (userInput, callback) {
  var instance = prepareBareProfile(userInput)
    , bcData = { login: instance.email, password: userInput.password }
    ;

  Credentials.prepareBasicCredentialsForCreation(bcData).validate(function (bcerr) {
    instance.validate(function (uerr) {
      var errors = customUtils.mergeErrors(bcerr, uerr);
      if (errors) { return callback(errors); }

      Credentials.createBasicCredentials(bcData, function (err, bc) {
        if (err) { return callback(err); }

        User.createAndSaveBareProfile(userInput, function (err, user) {
          if (err) { return callback(err); }

          user.attachCredentialsToProfile(bc, callback);   // Saving of User Profile happens here
        });
      });
    });
  });
};


/**
 * Attach credentials to this user profile
 * @param {Credentials} creds
 * @param {Function} cb Optional callback, signature: err, user
 */
UserSchema.methods.attachCredentialsToProfile = function (creds, cb) {
  var callback = cb || function () {}
    , self = this;

  creds.owner = self._id;
  creds.save(function (err) {
    if (err) { return callback(err); }   // Shouldn't happen
    self.credentials.push(creds._id);
    self.save(callback);
  });
};


/**
 * Get a user's basic or google credentials, if he has any
 *
 */
UserSchema.methods.getCredentialsInternal = function (type, callback) {
  Credentials.find({ _id: { $in: this.credentials } }, function (err, credsSet) {
    var found = false;
    if (err) { return callback(err); }

    credsSet.forEach(function (creds) {
      if (creds.type === type && ! found) {   // Only one basic credentials possible
        found = true;
        return callback(null, creds);
      }
    });

    if (!found) { return callback(null, null); }   // No basic credentials attached
  });
};

UserSchema.methods.getBasicCredentials = function (callback) {
  this.getCredentialsInternal('basic', callback);
}

UserSchema.methods.getGoogleCredentials = function (callback) {
  this.getCredentialsInternal('google', callback);
}


/**
 * Update a user password, if the user has any basic credentials attached
 * @param {String} currentPassword supplied by user for checking purposes
 * @param {String} newPassword chosen by user
 */
UserSchema.methods.updatePassword = function (currentPassword, newPassword, callback) {
  var self = this
    , errors = {};

  self.getBasicCredentials(function (err, creds) {
    if (creds) { creds.updatePassword(currentPassword, newPassword, callback); }
  });
};


/**
 * Wrapper around UserHistory.saveAction to be used in tldr creation and update
 * @param {String} type Type of action, see UserHistory.saveAction
 * @param {String} data Action data, see UserHistory.saveAction
 * @param {Function} cb Optional callback (signature: err, history)
 */
UserSchema.methods.saveAction = function (type, data, cb) {
  UserHistory.findOne({ _id: this.history }, function (err, history) {
    history.saveAction(type, data, cb);
  });
};



/**
 * Sets the URL to this user's gravatar
 * @param {String} gravatarEmail Email to be linked to the Gravatar account
 * @param {Function} callback To be called after having set the Gravatar url
 * @return {void}
 */
UserSchema.methods.updateGravatarEmail = function (gravatarEmail, callback) {
  this.gravatar = {};
  this.gravatar.email = gravatarEmail ? gravatarEmail : '';
  this.gravatar.url = customUtils.getGravatarUrlFromEmail(gravatarEmail);
  this.save(callback);
};


/**
 * Given a string, create an available username
 */
UserSchema.statics.findAvailableUsername = function (tentativeUsername, callback) {
  tentativeUsername = tentativeUsername || 'NewUser';
  tentativeUsername = tentativeUsername.replace(/[^A-Za-z0-9]/g, '');
  if (tentativeUsername.length > 13) { tentativeUsername = tentativeUsername.substring(0, 13); }
  if (tentativeUsername.length < 3) { tentativeUsername = 'NewUser'; }

  // Wtf ?? find then .length is actually faster than count ...
  User.find({ usernameLowerCased: new RegExp('^' + tentativeUsername.toLowerCase() + '[0-9]*$') })
      .exec(function (err, users) {
    if (err) { return callback(err); }
    var suffix = users.length === 0 ? '' : users.length;
    return callback(null, tentativeUsername + suffix);
  });
};




/**
 * Bind validators to schema
 */
UserSchema.statics.validateEmail = validateEmail;
UserSchema.statics.validateUsername = validateUsername;


// Define User model
User = mongoose.model('user', UserSchema);

// Export User
module.exports = User;

