var config = require('../../lib/config')

module.exports = function (req, res, next) {
  var partials = req.renderingPartials || {}
    , values = req.renderingValues || {}
    ;

  values.title = "Embedded summaries" + config.titles.branding + config.titles.shortDescription;
  values.description = "Embed summaries of any article in your webpages.";
  partials.content = '{{>website/pages/embeddedTldrs}}';

  res.render('website/basicLayout', { values: values
                                    , partials: partials
                                    });
}

