/**
 * Request
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */

var i18n = require('../lib/i18n')
  , mongoose = require('mongoose')
  , customUtils = require('../lib/customUtils')
  , check = require('validator').check
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.ObjectId
  , TldrSubscription, TldrSubscriptionSchema
  , async = require('async')
  , _ = require('underscore')
  , bunyan = require('../lib/logger').bunyan
  ;




/*
 * Schema definition
 */
TldrSubscriptionSchema = new Schema(
  { url: { type: String }
  , subscribersCount: { type: Number }
  , subscribers: [{ type: ObjectId, ref: 'user'}]
  , fulfilled: { type: Boolean, default: false }
  }
, { strict: true });




/*
 * Methods and static functions
 */

// Find existing requests and create a new one if not
TldrSubscriptionSchema.statics.findByBatchOrInsert = function (batch, cb) {
  var callback = cb ? cb : function () {};
  TldrSubscription.find({ url: { $in: batch } }, function (err, docs) {
    // Entries that are not in the db -> create a subscription for them
    var newEntries = _.difference(batch, _.pluck(docs, 'url'))
      , request;

    async.map(newEntries, function ( url, _cb) {
      // Fake  subscribers count at the beginning
      request = new TldrSubscription({ url: url, subscribersCount: Math.floor(Math.random()*50) + 17, subscribers: [] });
      request.save(_cb);

      }, function (err, results) {

        callback(err, _.union(results, docs));
      }
    );
  });
};

// Add request
TldrSubscriptionSchema.methods.addSubscriber = function (subscriber , cb) {
  var callback = cb ? cb : function () {};

  if (! subscriber || ! subscriber._id) {
    return callback({ subscriber: "required" });
  }

  // The user managed to subscribe twice -> dont do anything. Return cb with 3rd arg to true
  if (this.subscribers.indexOf(subscriber._id) !== -1) {
    return callback(null, this, true);
  }

  this.subscribers.addToSet(subscriber._id);
  this.subscribersCount += 1;
  this.save(function (err, tldr) { return callback(err, tldr, false); });
};


// Define the model
TldrSubscription = mongoose.model('subscription', TldrSubscriptionSchema);
// Export Post
module.exports = TldrSubscription;

