module.exports = function (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {};

  values.exampleSB = true;

  res.render('website/exampleSB', { values: {}, partials: {} });
}

