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

// Holds one version of a tldr, defined as the data, the date it was created and its creator
TldrVersionSchema = new Schema(
  { data: { type: String
          , required: true
          }
  , timeStamp: { type: Date
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



// Define tldrVersion and tldrHistory models
TldrVersion = mongoose.model('tldrVersion', TldrVersionSchema);
TldrHistory = mongoose.model('tldrHistory', TldrHistorySchema);


// Export Tldr
module.exports = TldrHistory;

