var models = require('../../lib/models')
  , Topic = models.Topic
  ;

module.exports = function (req, res, next) {
  var values = {};

  values.loggedUser = req.user;

  function renderTopic () {
    Topic.findOne({ _id: req.params.id })
         .populate('posts')
         .exec(function (err, topic) {

    values.topic = topic;

    res.render('website/basicLayout', { values: values
                                      , partials: { content: '{{>website/pages/forumShowTopic}}' }
                                      });
    });
  }

  Topic.findOne({ _id: req.params.id }, function (err, topic) {
    if (err || ! topic) {
      values.notFound = true;
      return renderTopic();
    }

    if (req.route.method === "post" && req.user) {
      topic.addPost({ text: req.body.text }, req.user, function(err, post) {
        renderTopic();
      });
    } else {
      renderTopic();
    }
  });

}
