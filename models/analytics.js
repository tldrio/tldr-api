/**
 * Define all models used to store the analytics and update them
 * The Event model stores all events analytics in case we need them in the future
 * The TldrAnalytics models are projections of these analytics on the Tldr collection, daily and weekly
 */

var mongoose = require('mongoose')
  , customUtils = require('../lib/customUtils')
  , mqClient = require('../lib/message-queue')
  , ObjectId = mongoose.Schema.ObjectId
  , Schema = mongoose.Schema
  , EventSchema, Event
  , TldrAnalyticsSchemaData, TldrAnalyticsSchema = {}, TldrAnalytics = {}
  , UserAnalyticsSchemaData, UserAnalyticsSchema = {}, UserAnalytics = {}
  ;


/**
 * ==============================
 * === Event model definition ===
 * ==============================
 * Most of the fields will be undefined because types only use
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
, thanks: { type: Number }
}, { collection: 'event' });

/**
 * Add a read event to the backup event collection
 * @param {Tldr} tldr
 * @param {Function} cb Optional callback, signature: err, event
 */
EventSchema.statics.addRead = function (tldr, cb) {
  var event = new Event({ type: 'tldr.read'
                        , timestamp: new Date()
                        , tldr: tldr._id
                        , readCount: 1
                        , wordsReadCount: 999   // TODO: replace by the actual one
                        , creator: tldr.creator
                        })
    , callback = cb || function () {}
    ;

  event.save(callback);
};



/**
 * =======================================
 * === TldrAnalytics models definition ===
 * =======================================
 * The same schema data will be used for both, the difference being in the resolution
 */
TldrAnalyticsSchemaData = {
  timestamp: { type: Date, required: true }
, tldr: { type: ObjectId, ref: 'tldr', required: true }
, readCount: { type: Number }
, wordsCount: { type: Number }
};
TldrAnalyticsSchema.daily = new Schema(TldrAnalyticsSchemaData, { collection: 'tldranalytics.daily' });
TldrAnalyticsSchema.monthly = new Schema(TldrAnalyticsSchemaData, { collection: 'tldranalytics.monthly' });

// Compound indexes on timestamp and tldr (both in ascending order)
TldrAnalyticsSchema.daily.index({ timestamp: 1, tldr: 1 });
TldrAnalyticsSchema.monthly.index({ timestamp: 1, tldr: 1 });


/**
 * Add an event to the tldr projections
 * The same internal function is used for both (daily and monthly versions)
 * @param {Model} Model Model to use, i.e. daily or monthly
 * @param {Function} resolution Resolution to use, i.e. to day or to month
 * @param {Object} updateObject What fields to increment and how
 * @param {ObjectID} tldrId
 * @param {Function} cb Optional callback, signature: err, numAffected, rawMongoResponse
 */
function addTldrEvent (Model, resolution, updateObject, tldrId, cb) {
  var callback = cb || function () {}
    ;

  Model.update( { timestamp: resolution(new Date()), tldr: tldrId }
              , { $inc: updateObject }
              , { upsert: true, multi: false }
              , callback
              );
}

// TODO: replace 999 by actual wordsReadCount when we have it
TldrAnalyticsSchema.daily.statics.addRead = function (tldrId, cb) {
  addTldrEvent(TldrAnalytics.daily, customUtils.getDayResolution, { readCount: 1, wordsReadCount: 999 }, tldrId, cb);
};

TldrAnalyticsSchema.monthly.statics.addRead = function (tldrId, cb) {
  addTldrEvent(TldrAnalytics.monthly, customUtils.getMonthResolution, { readCount: 1, wordsReadCount: 999 }, tldrId, cb);
};


/**
 * Return all analytics data concerning one tldr, between beg and end
 * @param {Model} Model Model to use, i.e. daily or monthly
 * @param {Date} beg Optional. Get data after this date, or after the beginning of times if it doesn't exist
 * @param {Date} end Optional. Get data before this date, or before the end of times if it doesn't exist
 * @param {ObjectID} tldrId
 * @param {Function} callback Siganture: err, array of time data points
 */
function getAnalytics (Model, beg, end, tldrId, callback) {
  var query = { tldr: tldrId };

  if (beg || end) {
    query.timestamp = {};
    if (beg) { query.timestamp.$gt = beg; }
    if (end) { query.timestamp.$lt = end; }
  }

  Model.find(query).sort('timestamp').exec(callback);
}

TldrAnalyticsSchema.daily.statics.getData = function (beg, end, tldrId, callback) {
  getAnalytics(TldrAnalytics.daily, beg, end, tldrId, callback);
};

TldrAnalyticsSchema.monthly.statics.getData = function (beg, end, tldrId, callback) {
  getAnalytics(TldrAnalytics.monthly, beg, end, tldrId, callback);
};



/**
 * =======================================
 * === UserAnalytics models definition ===
 * =======================================
 * The same schema data will be used for both, the difference being in the resolution
 */
UserAnalyticsSchemaData = {
  timestamp: { type: Date, required: true }
, user: { type: ObjectId, ref: 'user', required: true }
, readCount: { type: Number }
, wordsCount: { type: Number }
};
UserAnalyticsSchema.daily = new Schema(UserAnalyticsSchemaData, { collection: 'useranalytics.daily' });
UserAnalyticsSchema.monthly = new Schema(UserAnalyticsSchemaData, { collection: 'useranalytics.monthly' });

// Compound indexes on timestamp and user (both in ascending order)
UserAnalyticsSchema.daily.index({ timestamp: 1, user: 1 });
UserAnalyticsSchema.monthly.index({ timestamp: 1, user: 1 });


/**
 * Add an event to the user projections
 * The same internal function is used for both (daily and monthly versions)
 * @param {Model} Model Model to use, i.e. daily or monthly
 * @param {Function} resolution Resolution to use, i.e. to day or to month
 * @param {Object} updateObject What fields to increment and how
 * @param {User} user
 * @param {Function} cb Optional callback, signature: err, numAffected, rawMongoResponse
 */
function addUserEvent (Model, resolution, updateObject, user, cb) {
  var callback = cb || function () {};

  // TODO: replace 999 by actual wordsReadCount when we have it
  Model.update( { timestamp: resolution(new Date()), user: user._id }
              , { $inc: updateObject }
              , { upsert: true, multi: false }
              , callback
              );
}

UserAnalyticsSchema.daily.statics.addRead = function (user, cb) {
  addUserEvent(UserAnalytics.daily, customUtils.getDayResolution, { readCount: 1, wordsReadCount: 999 }, user, cb);
};

UserAnalyticsSchema.monthly.statics.addRead = function (user, cb) {
  addUserEvent(UserAnalytics.monthly, customUtils.getMonthResolution, { readCount: 1, wordsReadCount: 999 }, user, cb);
};




// Define the models
Event = mongoose.model('event', EventSchema);
TldrAnalytics.daily = mongoose.model('tldranalytics.daily', TldrAnalyticsSchema.daily);
TldrAnalytics.monthly = mongoose.model('tldranalytics.weekly', TldrAnalyticsSchema.monthly);
UserAnalytics.daily = mongoose.model('useranalytics.daily', UserAnalyticsSchema.daily);
UserAnalytics.monthly = mongoose.model('useranalytics.weekly', UserAnalyticsSchema.monthly);


// Handle all events
mqClient.on('tldr.read', function (data) {
  Event.addRead(data.tldr);
  TldrAnalytics.daily.addRead(data.tldr._id);
  TldrAnalytics.monthly.addRead(data.tldr._id);
  UserAnalytics.daily.addRead(data.tldr);
  UserAnalytics.monthly.addRead(data.tldr);
});


// Interface
module.exports.Event = Event;
module.exports.TldrAnalytics = TldrAnalytics;
module.exports.UserAnalytics = UserAnalytics;
