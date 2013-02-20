/**
 * Define all models used to store the analytics and update them
 * The Event model stores all events analytics in case we need them in the future
 * The TldrAnalytics models are projections of these analytics on the Tldr collection, daily and weekly
 */

var mongoose = require('mongoose')
  , customUtils = require('../lib/customUtils')
  , ObjectId = mongoose.Schema.ObjectId
  , Schema = mongoose.Schema
  , EventSchema, Event
  , TldrAnalyticsSchemaData
  , TldrAnalyticsSchema = {}
  , TldrAnalytics = {}
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
}, { collection: 'event' });



/**
 * === TldrAnalytics models definition ===
 * The same schema data will be used for both, the difference being in the resolution
 */
TldrAnalyticsSchemaData = {
  timestamp: { type: Date, required: true }
, tldr: { type: ObjectId, ref: 'tldr', required: true }
, readCount: { type: Number }
, wordsReadCount: { type: Number }
};
TldrAnalyticsSchema.daily = new Schema(TldrAnalyticsSchemaData, { collection: 'tldranalytics.daily' });
TldrAnalyticsSchema.monthly = new Schema(TldrAnalyticsSchemaData, { collection: 'tldranalytics.monthly' });
// TODO add compound indexes on timestamp + tldr


/**
 * Add an event to the tldr projections
 * The same internal function is used for both (daily and monthly versions)
 * Here is the signature of the external facing functions:
 * @param {Tldr} tldr
 * @param {Function} cb Optional callback, signature: err, numAffected, rawMongoResponse
 */
function addRead (Model, resolution, tldr, cb) {
  var callback = cb || function () {}

  // TODO: replace 999 by actual wordsReadCount when we have it
  Model.update( { timestamp: resolution(new Date), tldr: tldr._id }
                        , { $inc: { readCount: 1, wordsReadCount: 999 } }
                        , { upsert: true, multi: false }
                        , callback
                        );
}

TldrAnalyticsSchema.daily.statics.addRead = function (tldr, cb) {
  addRead(TldrAnalytics.daily, customUtils.getDayResolution, tldr, cb);
};

TldrAnalyticsSchema.monthly.statics.addRead = function (tldr, cb) {
  addRead(TldrAnalytics.monthly, customUtils.getMonthResolution, tldr, cb);
};


// Define the models
Event = mongoose.model('event', EventSchema);
TldrAnalytics.daily = mongoose.model('tldranalytics.daily', TldrAnalyticsSchema.daily);
TldrAnalytics.monthly = mongoose.model('tldranalytics.weekly', TldrAnalyticsSchema.monthly);



// Interface
module.exports.Event = Event;
module.exports.TldrAnalytics = TldrAnalytics;
