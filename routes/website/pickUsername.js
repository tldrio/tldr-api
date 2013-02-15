/**
 * The two handlers used to pick a username after a Google signup
 */
var config = require('../../lib/config')
  , models = require('../../lib/models')
  , _ = require('underscore')
  ;


function displayForm (req, res, next) {
  var values =  req.renderingValues || {}
    , partials = req.renderingPartials || {}
    ;

  values.title = "Choose a username" + config.titles.branding + config.titles.shortDescription;
  values.chosenUsername = (values.userInput && values.userInput.username) || (values.loggedUser && values.loggedUser.username);
  partials.content = '{{>website/pages/pickUsername}}';

  res.render('website/basicLayout', { values: values
                                    , partials: partials
                                    });
}

function changeUsername (req, res, next) {
  if (! req.user) { return res.redirect(302, '/'); }   // Nobody should be here by chance anyway, so no explanation

  req.user.updateValidFields({ username: req.body.username }, function (err) {
    if (err) {
      req.renderingValues.displayValidationErrors = true;
      req.renderingValues.validationErrors = _.values(models.getAllValidationErrorsWithExplanations(err.errors));
      req.renderingValues.userInput = req.body;
      displayForm(req, res, next);
    } else {
      res.redirect('/chrome-extension');
    }
  });
}


module.exports.displayForm = displayForm;
module.exports.changeUsername = changeUsername;
