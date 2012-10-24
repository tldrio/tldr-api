var models = require('../../lib/models')
  , Topic = models.Topic
  ;

module.exports = function (req, res, next) {
  var values = {};

  values.loggedUser = req.user;

  Topic.find({}, function(err, topics) {
    if (err) { return next({ statusCode: 500, body: { message: "An internal error occured" }}); }

    values.topics = topics;

    res.render('website/basicLayout', { values: values
                                      , partials: { content: '{{>website/pages/forum}}' }
                                      });
  });

}
