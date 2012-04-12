var mongoose = require('mongoose')

// Saves all objects in objectArray
var chainSave = function(objectArray, callback) {
  if (objectArray.length === 0) {
    callback();
  } else {
    objectArray[0].save(function(err) {
      chainSave(objectArray.slice(1, objectArray.length), callback);
    });
  }
};


module.exports.chainSave = chainSave;
