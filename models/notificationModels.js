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
  , from: {}
  , on: {}
  , to: {}
  , type: {}
  }
, { strict: true });

/**
 * Create a new Notification instance
 */

NotificationSchema.statics.createAndSaveInstance = function () {
  console.log('Create and Save Notif');
};


// Define tldr model
Notification = mongoose.model('notification', NotificationSchema);

// Export Tldr
module.exports = Notification;
