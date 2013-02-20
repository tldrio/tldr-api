/**
 * Define all models used to store the analytics and update them
 * The Event model stores all events analytics in case we need them in the future
 * The TldrEvent models are projections of these analytics on the Tldr collection, daily and weekly
 */

var mqClient = require('./lib/message-queue')
  , mongoose = require('mongoose')
  , customUtils = require('../lib/customUtils')
  , ObjectId = mongoose.Schema.ObjectId
  , Schema = mongoose.Schema
  , EventSchema, Event
  , TldrEventSchema
  , TldrEvent = {}
  ;


/**
 * === Event model definition ===
 * Most of the fields are undefined because types only use
 * a subset of those. For example, a 'tldr.read' event only concerns
 * a tldr, its readCount, its wordsReadCount and its creator
 */
EventSchema = new Schema({
  type: { type: String, required: true }
, timestamp: { type: Date, required: true }

, tldr: { type: ObjectId, ref: 'tldr' }
, readCount: { type: Number }
, wordsReadCount: { type: Number }
, creator: { type: ObjectId, ref: 'user' }

, user: { type: ObjectId, ref: 'user' }
, thanks: { type: Number }
});

Event = mongoose.model('event', EventSchema);


/**
 * === TldrEvent models definition ===
 * The same schema will be used for both, the difference being in the resolution
 */
TldrEventSchema = new Schema({
  timestamp: { type: Date, required: true }
, tldr: { type: ObjectId, ref: 'tldr', required: true }
, readCount: { type: Number }
, wordsReadCount: { type: Number }
});

TldrEvent.daily = mongoose.model('tldrevent.daily', TldrEventSchema);
TldrEvent.weekly = mongoose.model('tldrevent.weekly', TldrEventSchema);




