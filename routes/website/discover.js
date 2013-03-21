var config = require('../../lib/config')
  , models = require('../../lib/models')
  , Topic = models.Topic
  , Tldr = models.Tldr
  , _ = require('underscore')
  ;

module.exports = function (req, res, next) {
  var partials = req.renderingPartials || {}
    , values = req.renderingValues || {}
    ;

  values.title = "discover" + config.titles.branding + config.titles.shortDescription;
  values.description = "Private scratchpad to test stuff.";
  partials.content = '{{>website/pages/discover}}';

  Topic.getCategories(function (err, categories) {
    values.categories = _.pluck(categories, 'name');

    Tldr.findFromEveryCategory({ limit: 10, sort: '-createdAt'}, function(err, tldrs) {
      values.tldrs = tldrs;
      console.log(values.tldrs);

      res.render('website/responsiveLayout', { values: values
                                        , partials: partials
                                        });
    });
  });
}
