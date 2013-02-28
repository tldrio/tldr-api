var config = require('../../lib/config')

module.exports = function (req, res, next) {
  var partials = req.renderingPartials || {}
    , values = req.renderingValues || {}
    , marked = require('../../lib/customMarked')
    ;

  values.title = "Scratchpad" + config.titles.branding + config.titles.shortDescription;
  values.description = "Private scratchpad to test analytics graphs.";
  partials.content = '{{>website/pages/scratchpad}}';

  res.render('website/basicLayout', { values: values
                                    , partials: partials
                                    });
}
