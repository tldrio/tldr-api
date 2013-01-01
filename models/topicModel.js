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
  , _ = require('underscore')
  , bunyan = require('../lib/logger').bunyan
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
  , slug: { type: String, unique: true }
  , creator: { type: ObjectId, ref: 'user', required: true }
  , posts: [{ type: ObjectId, ref: 'post' }]
  , lastPost: { at: { type: Date
                    , default: Date.now }
              , by: { type: ObjectId, ref: 'user' }
              }
  , createdAt: { type: Date
               , default: Date.now
               }
  , votes: { type: Number
           , default: 1
           }
  , alreadyVoted: [{ type: ObjectId }]   // Array of users who already voted for/against this topic
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
  newTopic.alreadyVoted.push(creatorId);

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

  customUtils.createUnusedSlug(newTopic, 'title', 'slug', function (err, topic) {
    newTopic.save(callback);
  });
};


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
    self.lastPost = {};
    self.lastPost.at = new Date();
    self.lastPost.by = creator ? creator._id : null;   // Safe
    self.save(function (err, topic) {   // There can't be an error here
      callback(null, post);
    });
  });
};


/**
 * Create a new topic with a first post in it
 * @param {Object} topicData Data used to create the topic
 * @param {Object} postData Data used to create the post
 * @param {User} creator Creator of this topic and post
 * @param {Function} cb Optional callback. Signature: err, topic
 */
TopicSchema.statics.createTopicAndFirstPost = function (topicData, postData, creator, cb) {
  var newTopic = prepareTopicForCreation(topicData, creator)
    , firstPost = Post.preparePostForCreation(postData, creator)
    , callback = cb ? cb : function () {}
    , errors = null;

  newTopic.validate(function (terr) {
    firstPost.validate(function (perr) {
      // This is a bit verbose but needed to respect the usual errors signature
      if ((terr && terr.errors) || (perr && perr.errors)) {
        errors = { name: 'ValidationError'
                 , message: 'Validation failed'
                 , errors: _.extend( terr && terr.errors ? terr.errors : {}
                                   , perr && perr.errors ? perr.errors : {} ) };

        return callback(errors);
      }

      Topic.createAndSaveInstance(topicData, creator, function (err, topic) {
        if (err) {   // Shouldn't happen, really
          bunyan.error("What the heck ? Saving topic failed but validation was OK!");
          return callback (err);
        }

        topic.addPost(postData, creator, function (err, post) {
          if (err) {   // Shouldn't happen, really
            bunyan.error("What the heck ? Saving post failed but validation was OK!");
            return callback (err);
          }

          callback(null, topic);
        });
      });
    });
  });
};


/**
 * Vote for/against a topic
 * @param {Number} direction If positive, vote for. If negative, vote against
 * @param {User} voter User who voted (he can't vote again)
 * @param {Function} cb Optional callback. Signature: err, topic
 */
TopicSchema.methods.vote = function (direction, voter, cb) {
  var callback = cb ? cb : function () {};

  if (! voter || ! voter._id) {
    return callback({ voter: "required" });
  }

  if (this.alreadyVoted.indexOf(voter._id) !== -1) {
    return callback(null, this);   // Not an error, but nothing is done
  }

  this.votes = this.votes + (direction < 0 ? -1 : 1);
  this.alreadyVoted.push(voter._id);

  this.save(callback);
};


// Expose prepareTopicForCreation
TopicSchema.statics.prepareTopicForCreation = prepareTopicForCreation;



// Define the model
Topic = mongoose.model('topic', TopicSchema);


// Export Topic
module.exports = Topic;
