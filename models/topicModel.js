/**
 * Topic of the forum
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */

var i18n = require('../lib/i18n')
  , mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.ObjectId
  , TopicSchema, Topic
  ;



/**
 * Schema definition
 *
 */

// Holds the whole history of a tldr, indexed by url
TopicSchema = new Schema(
  { title: { type: String
           }
  }
, { strict: true });



// Define the model
Topic = mongoose.model('topic', TopicSchema);


// Export Topic
module.exports = Topic;
