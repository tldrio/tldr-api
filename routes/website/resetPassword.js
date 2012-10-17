/**
 * /resetPassword page of the website
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
*/


module.exports = function (req, res, next) {
  res.render('website/basicLayout', { values: req.renderingValues
                                    , partials: { content: '{{>website/pages/resetPassword}}' }
                                    });
}

