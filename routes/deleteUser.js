var User = require('../models/userModel');

module.exports = function (req, res, next) {
  console.log("===================");
  console.log("----------------");
  console.log(req.body);

  return res.send(200);
  //req.user.deleteAccount(function (err) {
    //if (err) {
      //return res.send(403);
    //} else {
      //return res.send(200);
    //}
  //});
};


