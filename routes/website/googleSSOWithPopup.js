var config = require('../../lib/config')

module.exports = function (req, res, next) {
  res.render('website/pages/googleSSOWithPopup', { values: {}, partials: {} });
}

