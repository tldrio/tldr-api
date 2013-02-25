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
//, cumulative: { readCount: { type: Number }   // Will store the cumulatives of the two data series
              //, articleWordCount: { type: Number }
              //}
};
TldrAnalyticsSchema.daily = new Schema(TldrAnalyticsSchemaData, { collection: 'tldranalytics.daily' });
TldrAnalyticsSchema.monthly = new Schema(TldrAnalyticsSchemaData, { collection: 'tldranalytics.monthly' });

// Compound indexes on timestamp and tldr (both in ascending order)
TldrAnalyticsSchema.daily.index({ timestamp: 1, tldr: 1 });
TldrAnalyticsSchema.monthly.index({ timestamp: 1, tldr: 1 });


/**
 * Add an event to the a projections
 * The same internal function is used for both (daily and monthly versions)
 * and for both (user and tldr) projections as the signatures are identical
 * @param {Model} Model Model to use, i.e. daily or monthly
 * @param {Function} resolution Resolution to use, i.e. to day or to month
 * @param {Object} updateObject What fields to increment and by how much
 * @param {Object} itemSelector Can select a tldr, a user or even several tldrs/users
 * @param {Function} cb Optional callback, signature: err
 */
function addEvent (Model, resolution, updateObject, itemSelector, cb) {
  var callback = cb || function () {}
    , updateKeys = Object.keys(updateObject)
    , timestamp = resolution(new Date())
    ;

  Model.update( _.extend({ timestamp: timestamp }, itemSelector)
              , { $inc: updateObject }
              , { upsert: true, multi: false }
              , function(err, numAffected, rawResponse) { return callback(err); }
              );
}
// Version that tracked cumulative, but it is too much of a pain
// As tracking holes is fucking difficult so we will just let clients recalculate
// the cumulatives
//function addEvent (Model, resolution, updateObject, itemSelector, cb) {
  //var callback = cb || function () {}
    //, update = { $inc: {} }
    //, updateKeys = Object.keys(updateObject)
    //, timestamp = resolution(new Date())
    //;

  //// Also update the cumulative data
  //updateKeys.forEach(function (key) {
    //update.$inc[key] = updateObject[key];
    //update.$inc['cumulative.' + key] = updateObject[key];
  //});

  //Model.update( _.extend({ timestamp: timestamp }, itemSelector)
              //, update
              //, { upsert: true, multi: false }
              //, function(err, numAffected, rawResponse) {
                  //var previousTimestamp, oneTimeUpdate;
                  //if (err) { return callback(err); }
                  //if (rawResponse.updatedExisting) { return callback(); }

                  //// This can only happen once, when the upsert was in fact an insert
                  //previousTimestamp = resolution.getPreviousPeriod(timestamp);
                  //Model.findOne(_.extend({ timestamp: previousTimestamp }, itemSelector), function (err, previousEvent) {
                    //if (err) { return callback(err); }
                    //oneTimeUpdate = { $inc: {} };
                    //updateKeys.forEach(function (key) {
                      //oneTimeUpdate.$inc['cumulative.' + key] = (previousEvent && previousEvent.cumulative) ? (previousEvent.cumulative[key] || 0) : 0;
                    //});
                    //Model.update(_.extend({ timestamp: timestamp }, itemSelector), oneTimeUpdate, {}, function (err) { callback(err); });
                  //});
                //}
              //);
//}

function addTldrEvent (Model, resolution, updateObject, tldrId, cb) {
  addEvent(Model, resolution, updateObject, { tldr: tldrId }, cb);
}

// Add a read
TldrAnalyticsSchema.daily.statics.addRead = function (tldr, cb) {
  addTldrEvent(TldrAnalytics.daily, customUtils.getDayResolution, { readCount: 1, articleWordCount: tldr.articleWordCount }, tldr._id, cb);
};

TldrAnalyticsSchema.monthly.statics.addRead = function (tldr, cb) {
  addTldrEvent(TldrAnalytics.monthly, customUtils.getMonthResolution, { readCount: 1, articleWordCount: tldr.articleWordCount }, tldr._id, cb);
};

// Add a thanks
TldrAnalyticsSchema.daily.statics.addThanks = function (tldr, cb) {
  addTldrEvent(TldrAnalytics.daily, customUtils.getDayResolution, { thanks: 1 }, tldr._id, cb);
};

TldrAnalyticsSchema.monthly.statics.addThanks = function (tldr, cb) {
  addTldrEvent(TldrAnalytics.monthly, customUtils.getMonthResolution, { thanks: 1 }, tldr._id, cb);
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


/**
 * Uses addEvent which is defined in the TldrAnalytics section
 */
function addUserEvent (Model, resolution, updateObject, userId, cb) {
  addEvent(Model, resolution, updateObject, { user: userId }, cb);
}

// Add a read
// tldr is the tldr that was read. These functions update its creator's stats
UserAnalyticsSchema.daily.statics.addRead = function (tldr, cb) {
  var userId = tldr.creator._id || tldr.creator;   // creator may be populated or not ...
  addUserEvent(UserAnalytics.daily, customUtils.getDayResolution, { readCount: 1, articleWordCount: tldr.articleWordCount }, userId, cb);
};

UserAnalyticsSchema.monthly.statics.addRead = function (tldr, cb) {
  var userId = tldr.creator._id || tldr.creator;   // creator may be populated or not ...
  addUserEvent(UserAnalytics.monthly, customUtils.getMonthResolution, { readCount: 1, articleWordCount: tldr.articleWordCount }, userId, cb);
};

// Add a thanks
UserAnalyticsSchema.daily.statics.addThanks = function (tldr, cb) {
  var userId = tldr.creator._id || tldr.creator;   // creator may be populated or not ...
  addUserEvent(UserAnalytics.daily, customUtils.getDayResolution, { thanks: 1 }, userId, cb);
};

UserAnalyticsSchema.monthly.statics.addThanks = function (tldr, cb) {
  var userId = tldr.creator._id || tldr.creator;   // creator may be populated or not ...
  addUserEvent(UserAnalytics.monthly, customUtils.getMonthResolution, { thanks: 1 }, userId, cb);
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
  Event.addRead(data.tldr);
  TldrAnalytics.daily.addRead(data.tldr);
  TldrAnalytics.monthly.addRead(data.tldr);
  UserAnalytics.daily.addRead(data.tldr);
  UserAnalytics.monthly.addRead(data.tldr);
});


// Interface
module.exports.Event = Event;
module.exports.TldrAnalytics = TldrAnalytics;
module.exports.UserAnalytics = UserAnalytics;
