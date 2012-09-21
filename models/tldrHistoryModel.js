/**
 * Tldr History
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */

var i18n = require('../lib/i18n')
  , mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.ObjectId
  , TldrHistorySchema, TldrHistory
  , TldrVersionSchema, TldrVersion
  ;



/**
 * Schemas definition
 *
 */

// Holds one version of a tldr, defined as the data to be versioned, the date it was created and its creator
TldrVersionSchema = new Schema(
  { data: { type: String
          , required: true
          }
  , createdAt: { type: Date
               , default: Date.now
               }
  , creator: { type: ObjectId, ref: 'user' }
  }
, { strict: true });


// Holds the whole history of a tldr, indexed by url
TldrHistorySchema = new Schema(
  { versions: [TldrVersionSchema]
  }
, { strict: true });


/**
 * Create a new entry (version) in this history
 * @param{String} data Data to be saved, which is the serialized version of part of a tldr
 * @param{String} creatorId Id of the creator of this entry
 * @param{Function} callback Optional callback function
 */
TldrHistorySchema.methods.saveVersion = function (data, creator, callback) {
  var tldrVersionData = creator ? { data: data, creator: creator._id} : { data: data }
  //var tldrVersionData = { data: data, creator: creator._id}
    , tldrVersion = new TldrVersion(tldrVersionData)
    , cb = callback ? callback : function() {};

  this.versions.unshift(tldrVersion);   // Versions need to be ordered from the latest onwards
  this.save(cb);
};



// Define tldrVersion and tldrHistory models
TldrVersion = mongoose.model('tldrVersion', TldrVersionSchema);
TldrHistory = mongoose.model('tldrHistory', TldrHistorySchema);




// Export Tldr
module.exports = TldrHistory;

