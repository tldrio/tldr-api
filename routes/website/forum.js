var models = require('../../lib/models')
  , Topic = models.Topic
  , customUtils = require('../../lib/customUtils')
  , _ = require('underscore')
  , config = require('../../lib/config')
  ;

module.exports = function (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {};

  values.forum = true;
  values.title = "Forum" + config.titles.branding;
  values.description = "Discuss everything related to tldr.io: feature suggestions, the best tl;drs, your favorite contributors etc.";
  partials.content = '{{>website/pages/forum}}';

  Topic.find({})
       .sort('-lastPost.at')
       .populate('lastPost.by', 'deleted username')
       .exec(function(err, topics) {
    if (err) { return next({ statusCode: 500, body: { message: "An internal error occured" }}); }

    values.topics = topics;

    _.each(topics, function (topic) {
       topic.lastPostTimeago = customUtils.timeago(topic.lastPost.at);
       topic.moreThanOnePost = (topic.posts.length > 1);
       topic.moreThanOneVote = (topic.votes > 1) || (topic.votes === 0) || (topic.votes < -1);

       if (req.user) {   // Won't display the buttons if nobody's logged in
         topic.userHasntVoted = topic.alreadyVoted.indexOf(req.user._id) === -1;
       }
     });

    res.render('website/basicLayout', { values: values
                                      , partials: partials
                                      });
  });

}
