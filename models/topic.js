/**
 * Define all kind of topics in the same models: categories, top domains etc.
 */

var mongoose = require('mongoose')
  , customUtils = require('../lib/customUtils')
  , i18n = require('../lib/i18n')
  , _ = require('underscore')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  , TopicSchema, Topic
  , Category = {}, Domain = {}
  ;

function validateType (value) {
  var possibleTypes = ['category', 'domain'];

  try {
    return possibleTypes.indexOf(value) !== -1;
  } catch (e) {
    return false;
  }
}

TopicSchema = new Schema({
  type: { type: String
        , required: true
        , validate: [validateType, i18n.topic.badType]
        }
, name: { type: String, required: true, unique: true }
});
TopicSchema.path('type').index(true);


/**
 * Create a new topic (domain or category)
 * @param {Boolean} options.safe Safe insert which doesn't raise an error in case of conflict
 * @param {Function} cb Optional callback, signature err, new topic if created
 */
TopicSchema.statics.createAndSaveInstance = function (topicData, _options, cb) {
  var callback, options, safe
    , topic = new Topic(topicData);

  if (typeof _options === 'function') {
    options = {};
    cb = _options;
  } else {
    options = _options;
  }

  callback = cb || function () {};
  safe = options.safe || false;

  topic.save(function (err, topic) {
    if (err) {
      if (!(safe && err.code === 11000)) { return callback(err); }
    }

    return callback(null, topic);
  });
};


/**
 * Get all categories
 */
TopicSchema.statics.getCategories = function (callback) {
  this.find({ type: 'category' }, function (err, categories) {
    if (err) {
      return callback(err);
    } else {
      return callback(null, categories);
    }
  });
};



/**
 * From an array of category names, return the array of corresponding topic _ids
 * @param {String or Array} _names either 'cat1 cat2 ...', [cat1, cat2, ...] or [{ name: cat1}, { name: cat2 }, ... ]  (the three possible expected forms)
 */
TopicSchema.statics.getCategoriesFromNames = function (names, cb) {
  var callback = cb || function () {};

  names = names || '';
  names = typeof names === 'string' ? names.split(' ') : names;
  if (names.length > 0 && typeof names[0] !== 'string') { names = _.pluck(names, 'name'); }

  Topic.find({ type: 'category', name: { $in: names } }, '', function (err, topics) {
    if (err) {
      return callback(err);
    } else {
      return callback(null, topics);
    }
  });
};



/**
 * Safely get a domain (add it if it doesn't exist)
 * The callback is optional. Signature: err, domain
 */
TopicSchema.statics.getDomainFromName = function (name, cb) {
  var callback = cb || function () {}
    , self = this;

  self.findOne({ type: 'domain', name: name }, function (err, domain) {
    if (err) { return callback(err); }
    if (domain) { return callback(err, domain); }

    self.createAndSaveInstance({ type: 'domain', name: name }, callback);
  });
};



Topic = mongoose.model('topic', TopicSchema);

module.exports = Topic;
