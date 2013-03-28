/**
 * Thread of the forum
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
  , ThreadSchema, Thread
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
ThreadSchema = new Schema(
  { title: { type: String
           , validate: [validateTitle, i18n.validateThreadTitle]
           , set: customUtils.sanitizeInput
           , required: true
           }
  , creator: { type: ObjectId, ref: 'user', required: true }
  , participants: [{ type: ObjectId, ref: 'user' }]
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
  , alreadyVoted: [{ type: ObjectId }]   // Array of users who already voted for/against this thread
  }
, { strict: true });

// Keep a virtual 'slug' attribute
ThreadSchema.virtual('slug').get(function () {
  return customUtils.slugify(this.title);
});

ThreadSchema.set('toJSON', {
   virtuals: true
});

/**
 * Used to create a Thread object and prepare it, to be created (=saved) or only validated
 * @param {Object} threadData Data entered to create this thread
 * @param {User} creator Creator of this thread
 * @return {Thread}
 */
function prepareThreadForCreation (threadData, creator) {
  var newThread = new Thread(threadData)
    , creatorId = creator ? creator._id : null;   // If there is no creator, a validation error will be returned

  newThread.creator = creatorId;
  newThread.alreadyVoted.push(creatorId);

  return newThread;
}



/*
 * Methods and statics
 */

/**
 * Create a new thread and persist it to the database
 * @param {Object} threadData Data entered to create this thread
 * @param {User} creator Creator of this thread
 * @param {Function} cb Optional callback. Signature: err, thread
 */
ThreadSchema.statics.createAndSaveInstance = function (threadData, creator, cb) {
  var callback = cb ? cb : function () {}
    , newThread = prepareThreadForCreation(threadData, creator);

  newThread.save(callback);
};


/**
 * Create a new post and add it to the thread
 * @param {Object} userInput Content of the post
 * @param {User} creator Creator of the post
 * @param {Function} cb Optional callback. Signature: err, post
 */
ThreadSchema.methods.addPost = function (userInput, creator, cb) {
  var callback = cb ? cb : function () {}
    , self = this;

  Post.createAndSaveInstance(userInput, creator, self, function (err, post) {
    if (err) { return callback(err); }
    self.participants.addToSet(creator._id);

    self.posts.push(post);
    self.lastPost = {};
    self.lastPost.at = new Date();
    self.lastPost.by = creator ? creator._id : null;   // Safe
    self.save(function (err, thread) {   // There can't be an error here
      callback(null, post);
    });
  });
};


/**
 * Create a new thread with a first post in it
 * @param {Object} threadData Data used to create the thread
 * @param {Object} postData Data used to create the post
 * @param {User} creator Creator of this thread and post
 * @param {Function} cb Optional callback. Signature: err, thread
 */
ThreadSchema.statics.createThreadAndFirstPost = function (threadData, postData, creator, cb) {
  var newThread = prepareThreadForCreation(threadData, creator)
    , firstPost = Post.preparePostForCreation(postData, creator)
    , callback = cb ? cb : function () {}
    ;

  newThread.validate(function (terr) {
    firstPost.validate(function (perr) {
			var errors = customUtils.mergeErrors(terr, perr);
			if (errors) { return callback(errors); }

      Thread.createAndSaveInstance(threadData, creator, function (err, thread) {
        if (err) {   // Shouldn't happen, really
          bunyan.error("What the heck ? Saving thread failed but validation was OK!");
          return callback (err);
        }

        thread.addPost(postData, creator, function (err, post) {
          if (err) {   // Shouldn't happen, really
            bunyan.error("What the heck ? Saving post failed but validation was OK!");
            return callback (err);
          }

          callback(null, thread);
        });
      });
    });
  });
};


/**
 * Vote for/against a thread
 * @param {Number} direction If positive, vote for. If negative, vote against
 * @param {User} voter User who voted (he can't vote again)
 * @param {Function} cb Optional callback. Signature: err, thread
 */
ThreadSchema.methods.vote = function (direction, voter, cb) {
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


// Expose prepareThreadForCreation
ThreadSchema.statics.prepareThreadForCreation = prepareThreadForCreation;



// Define the model
Thread = mongoose.model('thread', ThreadSchema);


// Export Thread
module.exports = Thread;
