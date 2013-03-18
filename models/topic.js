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
  //, approvedTopics = ['Art','Business', 'Design', 'Education', 'Gaming', 'Health', 'Internet', 'Politics', 'Programming', 'Science', 'Startups', 'World News']
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
 * Get All categories names
 */
TopicSchema.statics.getCategoriesNames = function (callback) {
  this.find({ type: 'category' }, 'name', function (err, topics) {
    if (err) {
      return callback(err);
    } else {
      return callback(null, _.map(topics, function (topic) { return topic.name; }));
    }
  });
};


/**
 * Create a new topic (mostly for dev purposes)
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
 * From an array of category names, return the array of corresponding topic _ids
 * @param {String or Array} _names either 'cat1 cat2 ...' or [cat1, cat2, ...]
 */
TopicSchema.statics.getIdsFromCategoryNames = function (_names, cb) {
  var names = typeof _names === 'string' ? _names.split(' ') : _names
    , callback = cb || function () {}
    ;

  Topic.find({ type: 'category', name: { $in: names } }, '', function (err, topics) {
    if (err) {
      return callback(err);
    } else {
      return callback(null, _.map(topics, function (t) { return t._id; }));
    }
  });
};




Topic = mongoose.model('topic', TopicSchema);

module.exports = Topic;
