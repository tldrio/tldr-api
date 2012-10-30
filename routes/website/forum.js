var models = require('../../lib/models')
  , Topic = models.Topic
  , customUtils = require('../../lib/customUtils')
  , _ = require('underscore')
  ;

module.exports = function (req, res, next) {
  var values = {};

  values.loggedUser = req.user;

  Topic.find({})
       .sort('-lastPost.at')
       .populate('lastPost.by', 'username')
       .exec(function(err, topics) {
    if (err) { return next({ statusCode: 500, body: { message: "An internal error occured" }}); }

    values.topics = topics;

    _.each(topics, function (topic) {
       topic.lastPostTimeago = customUtils.timeago(topic.lastPost.at);
       topic.moreThanOnePost = (topic.posts.length > 1);
     });

    res.render('website/basicLayout', { values: values
                                      , partials: { content: '{{>website/pages/forum}}' }
                                      });
  });

}
