/**
 * Topic of the forum
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */

var i18n = require('../lib/i18n')
  , mongoose = require('mongoose')
  , customUtils = require('../lib/customUtils')
  , check = require('validator').check
  , Post = require('../models/postModel')
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
  , posts: [{ type: ObjectId, ref: 'post' }]
  , lastPostAt: { type: Date
                , default: Date.now
                }
  }
, { strict: true });



/**
 * Used to create a Topic object and prepare it, to be created (=saved) or only validated
 * @param {Object} topicData Data entered to create this topic
 * @param {User} creator Creator of this topic
 * @return {Topic}
 */
function prepareTopicForCreation (topicData, creator) {
  var newTopic = new Topic(topicData)
    , creatorId = creator ? creator._id : null;   // If there is no creator, a validation error will be returned

  newTopic.creator = creatorId;

  return newTopic;
}



/*
 * Methods and statics
 */

/**
 * Create a new topic and persist it to the database
 * @param {Object} topicData Data entered to create this topic
 * @param {User} creator Creator of this topic
 * @param {Function} cb Optional callback. Signature: err, topic
 */
TopicSchema.statics.createAndSaveInstance = function (topicData, creator, cb) {
  var callback = cb ? cb : function () {}
    , newTopic = prepareTopicForCreation(topicData, creator);

  newTopic.save(callback);
}


/**
 * Create a new post and add it to the topic
 * @param {Object} userInput Content of the post
 * @param {User} creator Creator of the post
 * @param {Function} cb Optional callback. Signature: err, post
 */
TopicSchema.methods.addPost = function (userInput, creator, cb) {
  var callback = cb ? cb : function () {}
    , self = this;

  Post.createAndSaveInstance(userInput, creator, function (err, post) {
    if (err) { return callback(err); }

    self.posts.push(post);   // TODO: Mongoose claims this is atomic, but I think it's not. Check MongoDB's doc
    self.lastPostAt = new Date();
    self.save(function (err, topic) {   // There can't be an error here
      callback(null, post);
    });
  });
}


/**
 * Create a new topic with a first post in it
 * @param {Object} topicData Data used to create the topic
 * @param {Object} postData Data used to create the post
 * @param {User} creator Creator of this topic and post
 * @param {Function} cb Optional callback. Signature: err, topic
 */
TopicSchema.statics.createTopicAndFirstPost = function (topicData, postData, creator, cb) {


}



// Define the model
Topic = mongoose.model('topic', TopicSchema);


// Export Topic
module.exports = Topic;
