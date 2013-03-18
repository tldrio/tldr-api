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
        , unique: true
        , validate: [validateType, i18n.topic.badType]
        }
, name: { type: String, required: true, unique: true }
});


/**
 * Get All categories names
 */
TopicSchema.statics.getCategoriesNames = function (callback) {
  this.find({ type: 'category' }, { name: 1 }, function (err, topics) {
    if (err) {
      return callback(err);
    } else {
      return callback(null, _.map(topics, function (topic) { return topic.name; }));
    }
  });

};




Topic = mongoose.model('topic', TopicSchema);

module.exports = Topic;
