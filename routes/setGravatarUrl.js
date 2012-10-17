/*
 * API route to set the logged user's gravatar url
 */

module.exports = function (req, res, next) {

  if (req.user) {

  } else {
    res.setHeader('WWW-Authenticate', i18n.unknownUser);
    return res.json(401, { message: i18n.unauthorized} );
  }
}
