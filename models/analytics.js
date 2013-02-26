/**
 * Define all models used to store the analytics and update them
 * The Event model stores all events analytics in case we need them in the future
 * The TldrAnalytics models are projections of these analytics on the Tldr collection, daily and weekly
 */

var mongoose = require('mongoose')
  , customUtils = require('../lib/customUtils')
  , mqClient = require('../lib/message-queue')
  , _ = require('underscore')
  , ObjectId = mongoose.Schema.ObjectId
  , Tldr = require('./tldrModel')
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
, articleWordCount: { type: Number }
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
                        , articleWordCount: tldr.articleWordCount
                        , creator: tldr.creator
                        })
    , callback = cb || function () {}
    ;

  event.save(callback);
};



/**
 * =============================
 * === All-purpose functions ===
 * =============================
 */

/**
 * Add an event to a projection (tldr/user and daily/monthly)
 * @param {ObjectId} id id of the object (can be a tldr or a user depending on the model)
 * @param {Object} updateObject What fields to increment and by how much
 * @param {Function} cb Optional callback, signature: err
 */
function addEventToProjection (id, updateObject, cb) {
  var callback = cb || function () {}
    , updateKeys = Object.keys(updateObject)
    , timestamp = this.resolution(new Date())
    , itemSelector = this.itemSelector(id)
    ;

  this.update( _.extend({ timestamp: timestamp }, itemSelector)
              , { $inc: updateObject }
              , { upsert: true, multi: false }
              , function(err, numAffected, rawResponse) { return callback(err); }
              );
}


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
, articleWordCount: { type: Number }
, thanks: { type: Number }
};
TldrAnalyticsSchema.daily = new Schema(TldrAnalyticsSchemaData, { collection: 'tldranalytics.daily' });
TldrAnalyticsSchema.monthly = new Schema(TldrAnalyticsSchemaData, { collection: 'tldranalytics.monthly' });

// Compound indexes on timestamp and tldr (both in ascending order)
TldrAnalyticsSchema.daily.index({ timestamp: 1, tldr: 1 });
TldrAnalyticsSchema.monthly.index({ timestamp: 1, tldr: 1 });

// Declare resolutions for both models
TldrAnalyticsSchema.daily.statics.resolution = customUtils.getDayResolution;
TldrAnalyticsSchema.monthly.statics.resolution = customUtils.getMonthResolution;

// Declare how to get the item selector for both models
function getTldrSelector (id) { return { tldr: id}; }
TldrAnalyticsSchema.daily.statics.itemSelector = getTldrSelector;
TldrAnalyticsSchema.monthly.statics.itemSelector = getTldrSelector;

// Use addEvent to update the analytics
TldrAnalyticsSchema.daily.statics.addEvent = addEventToProjection;
TldrAnalyticsSchema.monthly.statics.addEvent = addEventToProjection;



// Add a read
TldrAnalyticsSchema.daily.statics.addRead = function (tldr, cb) {
  this.addEvent(tldr._id, { readCount: 1, articleWordCount: tldr.articleWordCount }, cb);
};

TldrAnalyticsSchema.monthly.statics.addRead = function (tldr, cb) {
  this.addEvent(tldr._id, { readCount: 1, articleWordCount: tldr.articleWordCount }, cb);
};




/**
 * Return all analytics data concerning one tldr, between beg and end
 * Used by the TldrAnalytics and the UserAnalytics
 * @param {Model} Model Model to use, i.e. daily or monthly
 * @param {Date} beg Optional. Get data after this date, or after the beginning of times if it doesn't exist
 * @param {Date} end Optional. Get data before this date, or before the end of times if it doesn't exist
 * @param {Object} baseQuery Query without selecting by time. Can select by tldr, user or on multiple tldrs
 * @param {Function} callback Siganture: err, array of time data points
 */
function getAnalytics (Model, beg, end, baseQuery, callback) {
  var query = baseQuery;

  if (beg || end) {
    query.timestamp = {};
    if (beg) { query.timestamp.$gt = beg; }
    if (end) { query.timestamp.$lt = end; }
  }

  Model.find(query).sort('timestamp').exec(callback);
}

TldrAnalyticsSchema.daily.statics.getData = function (beg, end, tldrId, callback) {
  getAnalytics(TldrAnalytics.daily, beg, end, { tldr: tldrId }, callback);
};

TldrAnalyticsSchema.monthly.statics.getData = function (beg, end, tldrId, callback) {
  getAnalytics(TldrAnalytics.monthly, beg, end, { tldr: tldrId }, callback);
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
, articleWordCount: { type: Number }
, thanks: { type: Number }
//, cumulative: { readCount: { type: Number }   // Will store the cumulatives of the two data series
              //, articleWordCount: { type: Number }
              //}
};
UserAnalyticsSchema.daily = new Schema(UserAnalyticsSchemaData, { collection: 'useranalytics.daily' });
UserAnalyticsSchema.monthly = new Schema(UserAnalyticsSchemaData, { collection: 'useranalytics.monthly' });

// Compound indexes on timestamp and user (both in ascending order)
UserAnalyticsSchema.daily.index({ timestamp: 1, user: 1 });
UserAnalyticsSchema.monthly.index({ timestamp: 1, user: 1 });

// Declare resolutions for both models
UserAnalyticsSchema.daily.statics.resolution = customUtils.getDayResolution;
UserAnalyticsSchema.monthly.statics.resolution = customUtils.getMonthResolution;

// Declare how to get the item selector
function getUserSelector (id) { return { user: id }; }
UserAnalyticsSchema.daily.statics.itemSelector = getUserSelector;
UserAnalyticsSchema.monthly.statics.itemSelector = getUserSelector;

UserAnalyticsSchema.daily.statics.addEvent = addEventToProjection;
UserAnalyticsSchema.monthly.statics.addEvent = addEventToProjection;


// Add a read
// tldr is the tldr that was read. These functions update its creator's stats
UserAnalyticsSchema.daily.statics.addRead = function (tldr, cb) {
  this.addEvent(Tldr.getCreatorId(tldr), { readCount: 1, articleWordCount: tldr.articleWordCount }, cb);
};

UserAnalyticsSchema.monthly.statics.addRead = function (tldr, cb) {
  this.addEvent(Tldr.getCreatorId(tldr), { readCount: 1, articleWordCount: tldr.articleWordCount }, cb);
};




/**
 * The following two funtions use getAnalytics which is defined in the
 * TldrAnalytics part since it can be used for both types of analytics
 */

UserAnalyticsSchema.daily.statics.getData = function (beg, end, userId, callback) {
  getAnalytics(UserAnalytics.daily, beg, end, { user: userId }, callback);
};

UserAnalyticsSchema.monthly.statics.getData = function (beg, end, userId, callback) {
  getAnalytics(UserAnalytics.monthly, beg, end, { user: userId }, callback);
};




// Define the models
Event = mongoose.model('event', EventSchema);
TldrAnalytics.daily = mongoose.model('tldranalytics.daily', TldrAnalyticsSchema.daily);
TldrAnalytics.monthly = mongoose.model('tldranalytics.monthly', TldrAnalyticsSchema.monthly);
UserAnalytics.daily = mongoose.model('useranalytics.daily', UserAnalyticsSchema.daily);
UserAnalytics.monthly = mongoose.model('useranalytics.monthly', UserAnalyticsSchema.monthly);


// Handle all events
mqClient.on('tldr.read', function (data) {
  var tldr = data.tldr;

  Event.addRead(tldr);

  TldrAnalytics.daily.addEvent(tldr._id, { readCount: 1, articleWordCount: tldr.articleWordCount });
  TldrAnalytics.monthly.addEvent(tldr._id, { readCount: 1, articleWordCount: tldr.articleWordCount });
  UserAnalytics.daily.addEvent(Tldr.getCreatorId(tldr), { readCount: 1, articleWordCount: tldr.articleWordCount });
  UserAnalytics.monthly.addEvent(Tldr.getCreatorId(tldr), { readCount: 1, articleWordCount: tldr.articleWordCount });
});

mqClient.on('tldr.thank', function (data) {
  var tldr = data.tldr;

  TldrAnalytics.daily.addEvent(tldr._id, { thanks: 1 });
  TldrAnalytics.monthly.addEvent(tldr._id, { thanks: 1 });
  UserAnalytics.daily.addEvent(Tldr.getCreatorId(tldr), { thanks: 1 });
  UserAnalytics.monthly.addEvent(Tldr.getCreatorId(tldr), { thanks: 1 });
});


// Interface
module.exports.Event = Event;
module.exports.TldrAnalytics = TldrAnalytics;
module.exports.UserAnalytics = UserAnalytics;
