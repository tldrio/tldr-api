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


/*
 * Methods and statics
 */

/**
 * Create a new topic and persist it to the database
 * @param {Object} userInput Data entered to create this post
 * @param {User} creator Creator of this post
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




// Define the model
Topic = mongoose.model('topic', TopicSchema);


// Export Topic
module.exports = Topic;
