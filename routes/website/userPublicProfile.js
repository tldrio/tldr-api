/**
 * User public profile page
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


module.exports = function (req, res, next) {
  var values = {};

  console.log(req.params.username);
  values.user = req.user;

  res.render('website/basicLayout', { values: values
                                    , partials: { content: '{{>website/pages/userPublicProfile}}' }
                                    });
}

