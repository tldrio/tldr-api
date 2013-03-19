/**
 * Return the list of our categories names
 * Remember, categories are a particular type of topic
 */

var models = require('../lib/models')
  , Topic = models.Topic
  ;

module.exports = function (req, res, next) {
  Topic.getCategoriesNames(function (err, names) {
    if (err) {
      return res.json(500, err);   // No reason this should happen
    } else {
      return res.json(200, names);
    }
  });
};
