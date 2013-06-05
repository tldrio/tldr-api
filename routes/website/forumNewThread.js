var models = require('../../lib/models')
  , Thread = models.Thread
  , _ = require('underscore')
  , config = require('../../lib/config')
  ;

module.exports = function (req, res, next) {
  var values =  req.renderingValues || {}
    , partials = req.renderingPartials || {}
    , threadData = { title: req.body.title }
    , postData = { text: req.body.firstPostText }
    ;

  values.forum = true;
  values.title = "Start a discussion" + config.titles.branding;
  partials.content = '{{>website/pages/forumNewThread}}';

  res.render('website/basicLayout', { values: values
                                    , partials: partials
                                    });

}
