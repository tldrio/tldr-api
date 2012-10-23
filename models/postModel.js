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
    check(value).len(1, 1000);
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
  }
, { strict: true });


/*
 * Methods and static functions
 */

/**
 * @param {Object} userInput Data entered to create this post
 * @param {Function} cb Optional callback. Signature: err, post
 */
PostSchema.statics.createAndSaveInstance = function (userInput, cb) {
  var newPost = new Post(userInput)
    , callback = cb ? cb : function () {};

  newPost.save(callback);
}


// Define the model
Post = mongoose.model('post', PostSchema);


// Export Post
module.exports = Post;

