module.exports = function (req, res, next) {
  var values = req.renderingValues || {}
    , partials = req.renderingPartials || {};

  values.exampleSB = true;

  values.tldr1 = {"hostname":"steveblank.com","creator":{"_id":"5056dad32f5e0bf0740004df","username":"capslocker"},"history":{"_id":"50b0fa14e293c2760f000a3d","__v":0,"versions":[{"_id":"50b0fa14e293c2760f000a3e","creator":"5056dad32f5e0bf0740004df","data":"{\"summaryBullets\":[\"You will be faced with ethical dilemmas your entire career\",\"Taking the wrong path is most often the easiest choice\",\"These choices will seem like trivial and inconsequential shortcuts – at the time\",\"Some of them will have lasting consequences\",\"It’s not the lie that will catch up with you, it’s the coverup\"],\"title\":\"Lying on your resume « Steve Blank\",\"resourceDate\":\"2012-07-30T00:00:00.000Z\"}","createdAt":"2012-11-24T16:47:16.926Z"}]},"url":"http://steveblank.com/2012/07/30/lying-on-your-resume","title":"Lying on your resume « Steve Blank","resourceDate":"2012-07-30T00:00:00.000Z","_id":"50b0fa14e293c2760f000a3c","__v":0,"discoverable":true,"versionDisplayed":0,"readCount":7,"updatedAt":"2012-11-24T16:47:16.920Z","createdAt":"2012-11-24T16:47:16.920Z","summaryBullets":["You will be faced with ethical dilemmas your entire career","Taking the wrong path is most often the easiest choice","These choices will seem like trivial and inconsequential shortcuts – at the time","Some of them will have lasting consequences","It’s not the lie that will catch up with you, it’s the coverup"]};

  res.render('website/exampleSB', { values: values, partials: {} });
}

