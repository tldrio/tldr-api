/**
 * Model Definition of Database using Mongoose
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */

var _ = require('underscore')
  , bunyan = require('../lib/logger').bunyan
  , i18n = require('../lib/i18n')
  , customUtils = require('../lib/customUtils')
  , mongoose = require('mongoose')
  , NotificationSchema
  , Notification
  , ObjectId = mongoose.Schema.ObjectId
  , Schema = mongoose.Schema
  , updatableFields = ['unseen']
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
  , unseen: { type: Boolean, default: true }
  , uniqueId: { type: String, required: true, unique: true}
  }
, { strict: true });

/**
 * Create a new Notification instance
 */

function createAndSaveInstance (options, cb) {
  var notification;

  options.uniqueId = options.type + options.to + options.tldr ;
  if (options.from === undefined) {
    options.uniqueId +=  customUtils.uid(24) ;
  } else {
    options.uniqueId += options.from;
  }

  notification = new Notification(options);
  notification.save(cb);
}

/*
 * Mark a notification as seen
 */
function markAsSeen (cb) {
  this.unseen = false;
  this.save(cb);
}

/**
 * Statics and methods
 */

NotificationSchema.statics.createAndSaveInstance = createAndSaveInstance;
NotificationSchema.methods.markAsSeen = markAsSeen;

// Define tldr model
Notification = mongoose.model('notification', NotificationSchema);

// Export Tldr
module.exports = Notification;
