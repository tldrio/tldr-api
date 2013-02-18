var bufferapp = require('../lib/bufferapp');

module.exports = function (req, res, next) {
  bufferapp.createUpdate("BIG TEST", req.body.profile_ids);
  res.send(200);   // Don't wait for Buffer to finish
}
