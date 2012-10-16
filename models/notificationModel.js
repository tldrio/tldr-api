/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */

var _ = require('underscore')
  , bunyan = require('../lib/logger').bunyan
  , i18n = require('../lib/i18n')
  , mongoose = require('mongoose')
  , NotificationSchema
  , Notification
  , ObjectId = mongoose.Schema.ObjectId
  , Schema = mongoose.Schema
  ;


/**
 * Schema
 *
 */

NotificationSchema = new Schema(
  { createdAt: { type: Date
               , default: Date.now
               }
  , from: { type: ObjectId, ref: 'user' }
  , tldr: { type: ObjectId, ref: 'tldr' }
  , to: { type: ObjectId, ref: 'user' }
  , type: { type: String }
  }
, { strict: true });

/**
 * Create a new Notification instance
 */

NotificationSchema.statics.createAndSaveInstance = function (options, cb) {
  var notification;

  notification = new Notification(options);
  notification.save(cb);
};


// Define tldr model
Notification = mongoose.model('notification', NotificationSchema);

// Export Tldr
module.exports = Notification;
