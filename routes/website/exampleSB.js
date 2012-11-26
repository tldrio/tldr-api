module.exports = function (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {};

  values.exampleSB = true;

  values.tldr1 = { "hostname": "steveblank.com"
                 , "creator": { "username":"capslocker" }
                 , "url":"http://steveblank.com/2012/07/30/lying-on-your-resume"
                 , "title":"Lying on your resume « Steve Blank"
                 , "_id":"50b0fa14e293c2760f000a3c"
                 , "summaryBullets": [ "You will be faced with ethical dilemmas your entire career"
                                     , "Taking the wrong path is most often the easiest choice"
                                     , "These choices will seem like trivial and inconsequential shortcuts – at the time"
                                     , "Some of them will have lasting consequences"
                                     , "It’s not the lie that will catch up with you, it’s the coverup"
                                     ]
                 };

  res.render('website/exampleSB', { values: values, partials: {} });
}

