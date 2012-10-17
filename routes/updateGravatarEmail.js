/*
 * API route to set the logged user's gravatar url
 * Used with POST and paramters newGravatarUrl
 */

module.exports = function (req, res, next) {

  if (req.user) {
    req.user.updateGravatarEmail(req.body.newGravatarUrl, function (err, user) {
      if (err) {
        return next({ statusCode: 500, message: i18n.couldntUpdateGravatarEmail });
      } else {
        return res.send(200, req.user.getAuthorizedFields());
      }
    });

  } else {
    res.setHeader('WWW-Authenticate', i18n.unknownUser);
    return res.json(401, { message: i18n.unauthorized} );
  }
}
