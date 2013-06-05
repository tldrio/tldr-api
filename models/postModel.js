/**
 * Post
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */

var i18n = require('../lib/i18n')
  , mongoose = require('mongoose')
  , customUtils = require('../lib/customUtils')
  , check = require('validator').check
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.ObjectId
  , PostSchema, Post
  ;


/*
 * Validators
 */
function validateText (value) {
  try {
    check(value).len(1, 2000);
    return true;
  } catch(e) {
    return false;
  }
}


/*
 * Schema definition
 */
PostSchema = new Schema(
  { text: { type: String
          , validate: [validateText, i18n.validatePostText]
          , set: customUtils.sanitizeInput
          , required: true
          }
  , creator: { type: ObjectId, ref: 'user', required: true }
  , thread: { type: ObjectId, ref: 'thread' }
  , createdAt: { type: Date
               , default: Date.now
               }
  }
, { strict: true });



/**
 * Used to create a Post object and prepare it, to be created (=saved) or only validated
 * @param {Object} postData Data entered to create this posst
 * @param {User} creator Creator of this post
 * @param {User} thread Thread containing this post
 * @return {Post}
 */
function preparePostForCreation (postData, creator, thread) {
  var newPost = new Post(postData)
    ;

  newPost.creator = creator ? creator._id : null;
  newPost.thread = thread ? thread._id : null;

  return newPost;
}


/*
 * Methods and static functions
 */

/**
 * Create a new post and persist it to the database
 * @param {Object} postData Data entered to create this post
 * @param {User} creator Creator of this post
 * @param {User} thread Thread containing this post
 * @param {Function} cb Optional callback. Signature: err, post
 */
PostSchema.statics.createAndSaveInstance = function (postData, creator, thread, cb) {
  var callback = cb ? cb : function () {}
    , newPost = preparePostForCreation(postData, creator, thread);

  newPost.save(callback);
};

/**
 * Change a post text
 * @param {String} newText Text set to replace the current text
 * @param {Function} cb Optional callback
 */
PostSchema.methods.changeText = function (newText, cb) {
  var callback = cb || function () {}
    , self = this;

  this.text = newText;
  this.validate(function (err) {
    if (err) { return callback(err); }

    Post.update({ _id: self._id }, { $set: { text: newText } }, { multi: false }, callback);
  });
};


// Expose preparePostForCreation
PostSchema.statics.preparePostForCreation = preparePostForCreation;


// Define the model
Post = mongoose.model('post', PostSchema);


// Export Post
module.exports = Post;

