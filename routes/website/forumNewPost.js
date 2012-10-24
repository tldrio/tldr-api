var models = require('../../lib/models')
  , Topic = models.Topic
  ;

module.exports = function (req, res, next) {
  var values = {};

  values.loggedUser = req.user;

  //Stub
  return res.json(200, {});
  // TODO: Find a way to do validation with Mongoose

  //Topic.find({}, function(err, topics) {
    //if (err) { return next({ statusCode: 500, body: { message: "An internal error occured" }}); }

    //values.topics = topics;

    //return res.json(201, { b:"f" });
    //res.render('website/basicLayout', { values: values
                                      //, partials: { content: '{{>website/pages/forum}}' }
                                      //});
  //});

}

