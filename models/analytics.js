/**
 * Define all models used to store the analytics and update them
 * The Event model stores all events analytics in case we need them in the future
 * The TldrAnalytics models are projections of these analytics on the Tldr collection, daily and weekly
 */

var mongoose = require('mongoose')
  , customUtils = require('../lib/customUtils')
  , mqClient = require('../lib/message-queue')
  , _ = require('underscore')
  , Tldr = require('./tldrModel')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
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
              , updateObject
              , { upsert: true, multi: false }
              , function(err, numAffected, rawResponse) { return callback(err); }
              );
}

/**
 * Return all analytics data concerning one tldr, between beg and end
 * @param {Date} beg Optional. Get data after this date, or after the beginning of times if it doesn't exist
 * @param {Date} end Optional. Get data before this date, or before the end of times if it doesn't exist
 * @param {ObjectId} id id of the object (tldr or user)
 * @param {Function} callback Siganture: err, array of time data points
 */
function getAnalytics (beg, end, id, callback) {
  var toFind = id instanceof Array ? { $in: id } : id
    , query = this.itemSelector(toFind)
    ;

  if (beg || end) {
    query.timestamp = {};
    if (beg) { query.timestamp.$gte = beg; }
    if (end) { query.timestamp.$lte = end; }
  }

  this.find(query).sort('timestamp').exec(callback);
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
function getTldrSelector (id) { return { tldr: id }; }
TldrAnalyticsSchema.daily.statics.itemSelector = getTldrSelector;
TldrAnalyticsSchema.monthly.statics.itemSelector = getTldrSelector;

// Use addEvent to update the analytics
TldrAnalyticsSchema.daily.statics.addEvent = addEventToProjection;
TldrAnalyticsSchema.monthly.statics.addEvent = addEventToProjection;

// Get the analytics
TldrAnalyticsSchema.daily.statics.getAnalytics = getAnalytics;
TldrAnalyticsSchema.monthly.statics.getAnalytics = getAnalytics;


// Add a read - Only used for testing purposes since I can't test the events well
TldrAnalyticsSchema.daily.statics.addRead = function (tldr, cb) {
  this.addEvent(tldr._id, { $inc: { readCount: 1, articleWordCount: tldr.articleWordCount } }, cb);
};

TldrAnalyticsSchema.monthly.statics.addRead = function (tldr, cb) {
  this.addEvent(tldr._id, { $inc: { readCount: 1, articleWordCount: tldr.articleWordCount } }, cb);
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
, tldrsCreated: [{ type: ObjectId, ref: 'tldr' }]
, tldrsRead: { type: Number }
};


UserAnalyticsSchema.daily = new Schema(UserAnalyticsSchemaData, { collection: 'useranalytics.daily' });
UserAnalyticsSchemaData.tldrsCreated = [{ type: ObjectId, ref: 'tldr' }];   // Ugly quickfix before they answer my question
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

// Add an event
UserAnalyticsSchema.daily.statics.addEvent = addEventToProjection;
UserAnalyticsSchema.monthly.statics.addEvent = addEventToProjection;

// Get analytics
UserAnalyticsSchema.daily.statics.getAnalytics = getAnalytics;
UserAnalyticsSchema.monthly.statics.getAnalytics = getAnalytics;


// Add a read - Only used for testing purposes since I can't test the events well
// tldr is the tldr that was read. These functions update its creator's stats
UserAnalyticsSchema.daily.statics.addRead = function (tldr, cb) {
  this.addEvent(Tldr.getCreatorId(tldr), { $inc: { readCount: 1, articleWordCount: tldr.articleWordCount } }, cb);
};

UserAnalyticsSchema.monthly.statics.addRead = function (tldr, cb) {
  this.addEvent(Tldr.getCreatorId(tldr), { $inc: { readCount: 1, articleWordCount: tldr.articleWordCount } }, cb);
};



// Define the models
Event = mongoose.model('event', EventSchema);
TldrAnalytics.daily = mongoose.model('tldranalytics.daily', TldrAnalyticsSchema.daily);
TldrAnalytics.monthly = mongoose.model('tldranalytics.monthly', TldrAnalyticsSchema.monthly);
UserAnalytics.daily = mongoose.model('useranalytics.daily', UserAnalyticsSchema.daily);
UserAnalytics.monthly = mongoose.model('useranalytics.monthly', UserAnalyticsSchema.monthly);


// Handle all events
//mqClient.on('tldr.read', function (data) {
  //var tldr = data.tldr;

  //Event.addRead(tldr);
  //TldrAnalytics.daily.addEvent(tldr._id, { $inc: { readCount: 1, articleWordCount: tldr.articleWordCount } });
  //TldrAnalytics.monthly.addEvent(tldr._id, { $inc: { readCount: 1, articleWordCount: tldr.articleWordCount } });
  //UserAnalytics.daily.addEvent(Tldr.getCreatorId(tldr), { $inc: { readCount: 1, articleWordCount: tldr.articleWordCount } });
  //UserAnalytics.monthly.addEvent(Tldr.getCreatorId(tldr), { $inc: { readCount: 1, articleWordCount: tldr.articleWordCount } });
//});

//mqClient.on('tldr.thank', function (data) {
  //var tldr = data.tldr;

  //TldrAnalytics.daily.addEvent(tldr._id, { $inc: { thanks: 1 } });
  //TldrAnalytics.monthly.addEvent(tldr._id, { $inc: { thanks: 1 } });
  //UserAnalytics.daily.addEvent(Tldr.getCreatorId(tldr), { $inc: { thanks: 1 } });
  //UserAnalytics.monthly.addEvent(Tldr.getCreatorId(tldr), { $inc: { thanks: 1 } });
//});

//mqClient.on('tldr.created', function (data) {
  //var tldr = data.tldr;

  //UserAnalytics.daily.addEvent(Tldr.getCreatorId(tldr), { $push: { tldrsCreated: tldr._id } });
  //UserAnalytics.monthly.addEvent(Tldr.getCreatorId(tldr), { $push: { tldrsCreated: tldr._id } });
//});





// ONLY HERE FOR MIGRATION PURPOSES
module.exports.replayRead = function (tldr, cb) {
  Event.addRead(tldr, function (err) {
    if (err) { return cb(err); }
    TldrAnalytics.daily.addEvent(tldr._id, { $inc: { readCount: 1, articleWordCount: tldr.articleWordCount } }, function (err) {
      if (err) { return cb(err); }
      TldrAnalytics.monthly.addEvent(tldr._id, { $inc: { readCount: 1, articleWordCount: tldr.articleWordCount } }, function (err) {
        if (err) { return cb(err); }
        UserAnalytics.daily.addEvent(Tldr.getCreatorId(tldr), { $inc: { readCount: 1, articleWordCount: tldr.articleWordCount } }, function (err) {
          if (err) { return cb(err); }
          UserAnalytics.monthly.addEvent(Tldr.getCreatorId(tldr), { $inc: { readCount: 1, articleWordCount: tldr.articleWordCount } }, function (err) {
            if (err) { return cb(err); }
            return cb();
          });
        });
      });
    });
  });
};

module.exports.replayThanks = function (tldr, cb) {
  TldrAnalytics.daily.addEvent(tldr._id, { $inc: { thanks: 1 } }, function (err) {
    if (err) { return cb(err); }
    TldrAnalytics.monthly.addEvent(tldr._id, { $inc: { thanks: 1 } }, function (err) {
      if (err) { return cb(err); }
      UserAnalytics.daily.addEvent(Tldr.getCreatorId(tldr), { $inc: { thanks: 1 } }, function (err) {
        if (err) { return cb(err); }
        UserAnalytics.monthly.addEvent(Tldr.getCreatorId(tldr), { $inc: { thanks: 1 } }, function (err) {
          if (err) { return cb(err); }
          return cb();
        });
      });
    });
  });
};

module.exports.replayTldrsCreation = function (tldr, cb) {
  UserAnalytics.daily.addEvent(Tldr.getCreatorId(tldr), { $push: { tldrsCreated: tldr._id } }, function (err) {
    if (err) { return cb(err); }
    UserAnalytics.monthly.addEvent(Tldr.getCreatorId(tldr), { $push: { tldrsCreated: tldr._id } }, function (err) {
      if (err) { return cb(err); }
      return cb();
    });
  });
};
// END OF ONLY HERE FOR MIGRATION PURPOSES





// Interface
module.exports.Event = Event;
module.exports.TldrAnalytics = TldrAnalytics;
module.exports.UserAnalytics = UserAnalytics;
