/**
 * User History
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */

var i18n = require('../lib/i18n')
  , mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.ObjectId
  , UserHistorySchema, UserHistory
  , UserActionSchema, UserAction
  ;



/**
 * Schemas definition
 *
 */

// Holds one user action, defined as a type "tldrCreation, tldrEdit", a timestamp and optional
// corresponding data (such as the version of the tldr that was created or edited)
UserActionSchema = new Schema(
  { data: { type: String
          , required: true
          }
  , timestamp: { type: Date
               , default: Date.now
               }
  , type: { type: String
          , required: true
          }
  }
, { strict: true });


// Holds the whole history of a user's actions
UserHistorySchema = new Schema(
  { actions: [UserActionSchema]
  }
, { strict: true });


/**
 * Create a new entry (action) in this history
 * @param{String} type Type of action
 * @param{String} data Data to be saved relative to this action (e.g. the tldr that was edited)
 * @param{Function} callback Optional callback function
 */
UserHistorySchema.methods.saveAction = function (type, data, callback) {
  var userAction = new UserAction({ type: type, data: data })
    , cb = callback ? callback : function() {};

  this.actions.unshift(userAction);   // Actions need to be ordered from the latest onwards
  this.save(cb);
};



// Define userAction and userHistory models
UserAction = mongoose.model('userAction', UserActionSchema);
UserHistory = mongoose.model('userHistory', UserHistorySchema);




// Export UserHistory
module.exports = UserHistory;

