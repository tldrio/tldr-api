var models = require('../../lib/models')
  , Topic = models.Topic
  , _ = require('underscore')
  , config = require('../../lib/config')
  ;

module.exports = function (req, res, next) {
  var values =  req.renderingValues || {}
    , partials = req.renderingPartials || {}
    , topicData = { title: req.body.title }
    , postData = { text: req.body.firstPostText }
    ;

  values.forum = true;
  partials.content = '{{>website/pages/forumNewTopic}}';

  res.render('website/basicLayout', { values: values
                                    , partials: partials
                                    });

}
