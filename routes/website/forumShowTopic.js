var models = require('../../lib/models')
  , Topic = models.Topic
  , _ = require('underscore')
  , config = require('../../lib/config')
  ;

module.exports = function (req, res, next) {
  var values = req.renderValues ? req.renderValues : {};

  values.loggedUser = req.user;

  Topic.findOne({ _id: req.params.id })
       .populate('posts')
       .exec(function (err, topic) {

    values.topic = topic;

    res.render('website/basicLayout', { values: values
                                      , partials: { content: '{{>website/pages/forumShowTopic}}' }
                                      });
  });
};
