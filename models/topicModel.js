/**
 * Topic of the forum
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */

var i18n = require('../lib/i18n')
  , mongoose = require('mongoose')
  , customUtils = require('../lib/customUtils')
  , check = require('validator').check
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.ObjectId
  , TopicSchema, Topic
  ;


/*
 * Validators
 */
function validateTitle (value) {
  try {
    check(value).len(1, 100);
    return true;
  } catch(e) {
    return false;
  }
}



/*
 * Schema definition
 */

// Holds the whole history of a tldr, indexed by url
TopicSchema = new Schema(
  { title: { type: String
           , validate: [validateTitle, i18n.validateTopicTitle]
           , set: customUtils.sanitizeInput
           , required: true
           }
  , creator: { type: ObjectId, ref: 'user', required: true }
  }
, { strict: true });


/*
 * Methods and statics
 */

/**
 * @param {Object} userInput Data entered to create this post
 * @param {Function} cb Optional callback. Signature: err, post
 */
TopicSchema.statics.createAndSaveInstance = function (userInput, creator, cb) {
  var newTopic = new Topic(userInput)
    , callback = cb ? cb : function () {}
    , creatorId = creator ? creator._id : null;   // If there is no creator, a validation error will be returned
    ;

  newTopic.creator = creatorId;

  newTopic.save(callback);
}


// Define the model
Topic = mongoose.model('topic', TopicSchema);


// Export Topic
module.exports = Topic;
