var config = require('../../lib/config')
  , models = require('../../lib/models')
  , Topic = models.Topic
  , Tldr = models.Tldr
  , _ = require('underscore')
  ;


function category (req, res, next) {
  var partials = req.renderingPartials || {}
    , values = req.renderingValues || {}
    , topic = req.params.topic
    , sort = req.params.sort
    ;

  values.title = "discover" + config.titles.branding + config.titles.shortDescription;
  values.description = "Discover tldrs";
  partials.content = '{{>website/pages/discover}}';

  switch (sort) {
    case 'newest':
      sort = '-createdAt';
      values.newest = true;
      break;
    case 'mostread':
      sort = '-readCount';
      values.mostread = true;
      break;
    default:
      sort = '-createdAt';
      break;
  }

  Tldr.findFromEveryCategory({ limit: 10, sort: sort}, function(err, tldrsByCategory) {
    values.tldrsByCategory = tldrsByCategory;
    // find the active category
    if (topic) {
      values.tldrsByCategory.forEach(function (e) {
        if (topic === e.categoryName) {
          e.active = 'active';
          values.activeCategory = e.categoryName;
        }
      });
    } else {
      values.tldrsByCategory[0].active = 'active';
      values.activeCategory = values.tldrsByCategory[0].categoryName;
    }

    res.render('website/responsiveLayout', { values: values
                                      , partials: partials
                                      });
  });
}


// Interface
module.exports = category;
