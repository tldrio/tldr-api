/**
 * Define all models used to store the analytics and update them
 * The Event model stores all events analytics in case we need them in the future
 * The TldrEvent models are projections of these analytics on the Tldr collection, daily and weekly
 */

var mongoose = require('mongoose')
  , customUtils = require('../lib/customUtils')
  , ObjectId = mongoose.Schema.ObjectId
  , Schema = mongoose.Schema
  , EventSchema, Event
  , TldrEventSchemaData
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
 * The same schema data will be used for both, the difference being in the resolution
 */
TldrEventSchemaData = {
  timestamp: { type: Date, required: true }
, tldr: { type: ObjectId, ref: 'tldr'}
, readCount: { type: Number }
, wordsReadCount: { type: Number }
};

TldrEvent.daily = mongoose.model('tldrevent.daily', new Schema(TldrEventSchemaData, { collection: 'tldrevent.daily' }));
TldrEvent.weekly = mongoose.model('tldrevent.weekly', new Schema(TldrEventSchemaData, { collection: 'tldrevent.weekly' }));




// Interface
module.exports.Event = Event;
module.exports.TldrEvent = TldrEvent;
