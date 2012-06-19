/**
 * Request Handlers for tldr
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
*/


var mongoose = require('mongoose') // Mongoose ODM to Mongo
  , bunyan = require('./lib/logger').bunyan
  , _ = require('underscore')
  , models = require('./models')
  , normalizeUrl = require('./lib/customUtils').normalizeUrl
  , TldrModel = models.TldrModel;


/**
 * Convenience route for latest tldrs
 *
 */
function getLatestTldrs (req, res, next) {
  var quantity = req.params.quantity
    , newReq = req;
  newReq.query.quantity = quantity;
  searchTldrs(newReq, res, next);
}


/**
 * Returns a search of tldrs (through route /tldrs/search)
 * You can specify which tldrs you want with the following parameters in the URL
 * Currently the olderthan parameter has priority over the startat parameter
 * @param {Integer} quantity quantity of tldrs to be fetched. Can't be greater than 10 (Optional - default: 10)
 * @param {Integer} startat Where to start looking for tldrs. 0 to start at the latest, 5 to start after the fifth latest and so on (Optional - default: 0)
 * @param {Integer} olderthan Returned tldrs must be older than this date, which is expressed as the number of milliseconds since Epoch - it's given by the Date.getTime() method in Javascript (Optional - default: now)
 * @param {String} url If set, this handler will return the tldr (if any) whose url is the url parameter
 *
 * If both startat and olderthan are set, we use olderthan only.
 */
function searchTldrs (req, res, next) {
  var query = req.query
    , url = query.url
    , defaultLimit = 10
    , limit = query.quantity || defaultLimit
    , startat = query.startat || 0
    , olderthan = query.olderthan;


  // If we have a url specified we don't need to go further just grab the
  // corresponding tldr
  if (url) {
    url = normalizeUrl(url);
    TldrModel.find({url: url}, function (err, docs) {
      if (err) {
        return next({ statusCode: 500, body: { message: 'Internal Error while getting Tldr by url' } } );
      }

      if (docs.length === 0) {
        return next({ statusCode: 404, body: { message: 'ResourceNotFound' } } );
      }

      return res.json(200, docs[0]);    // Success
    });

    return;
  }

  // Check that limit is an integer and clip it between 1 and defaultLimit
  if (isNaN(limit)) { limit = defaultLimit; }
  limit = Math.max(0, Math.min(defaultLimit, limit));
  if (limit === 0) { limit = defaultLimit; }

  if (olderthan) {
    // olderthan should be an Integer. If not we use the default value (now as the number of milliseconds since Epoch)
    if (isNaN(olderthan)) { olderthan = (new Date()).getTime(); }

    TldrModel.find({})
     .sort('updatedAt', -1)
     .limit(limit)
     .lt('updatedAt', olderthan)
     .exec(function(err, docs) {
       if (err) {
         return next({ statusCode: 500, body: {message: 'Internal Error executing query' } });
       }

       res.json(200, docs);
     });


  } else {
    // startat should be an integer and at least 0
    if (isNaN(startat)) { startat = 0; }
    startat = Math.max(0, startat);

    TldrModel.find({})
     .sort('updatedAt', -1)
     .limit(limit)
     .skip(startat)
     .exec(function(err, docs) {
       if (err) {
         return next({ statusCode: 500, body: {message: 'Internal Error executing query' } });
       }
       res.json(200, docs);
     });
  }
}


/**
 * GET /tldrs/:id
 * We query tldr by id here
 */

function getTldrById (req, res, next) {

  var id = req.params.id;


  if (req.headers.accept === 'text/html') {
    // We serve the tldr Page

    return res.send(200, '<html> Tldr Page</html>');
  } else if (req.headers.accept === 'application/json') {
    // We serve the raw tldr data

    TldrModel.find({_id: id}, function (err, docs) {
      var tldr;
      if (err) {
        return next({ statusCode: 500, body: { message: 'Internal Error while getting Tldr by Id' } } );
      }

      // We found the record
      if (docs.length === 1) {
        tldr = docs[0];
        return res.send(200, tldr);
      }

      // There is no record for this id
      return next({ statusCode: 404, body: { message: 'ResourceNotFound' } } );
    });
  }
}


/**
 * Convenience function to factor code betweet PUT and POST on
 * already existing tldr
 *
 */

function internalUpdateCb (err, docs, req, res, next) {

  var oldTldr;

  if (err) {
    return next({ statusCode: 500, body: { message: 'Internal Error while getting Tldr by url' } } );
  }

  if (docs.length === 1) {
    oldTldr = docs[0];

    oldTldr.updateValidFields(req.body, function (err, updatedTldr) {
      if (err) {
        if (err.errors) {
          return next({ statusCode: 403, body: models.getAllValidationErrorsWithExplanations(err.errors)} );
        }
        return next({ statusCode: 500, body: { message: 'Internal Error while updating Tldr' } } );
      }

      // With 204 even if a object is provided it's not sent by express
      return res.send(204);
    });
  } else {
    return next({ statusCode: 404, body: { message: 'ResourceNotFound' } } );
  }
}



/**
 * Handles POST /tldrs
 * create new tldr, as per the spec
 * http://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.6
 * oldest POST wins if there are concurrent POSTs
 *
 */

function postNewTldr (req, res, next) {

  if (!req.body) {
    return next({ statusCode: 400, body: { message: 'Body required in request' } } );
  }

  TldrModel.createAndSaveInstance(req.body, function (err, tldr) {
    if (err) {
      if (err.errors) {
        return next({ statusCode: 403, body: models.getAllValidationErrorsWithExplanations(err.errors)} );
      } else if (err.code === 11000) { // code 11000 is for duplicate key in a mongodb index

        var url = normalizeUrl(req.body.url);

        TldrModel.find({url: url}, function (err, docs) {
          internalUpdateCb(err, docs, req, res, next);
        });

      } else {
        return next({ statusCode: 500, body: { message: 'Internal Error while creatning Tldr ' } } );
      }

    } else {
      res.json(201, tldr);
    }
  });

}

/**
 * Handles PUT /tldrs/:id
 * updates the tldr, as per the spec
 * http://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.6
 *
 */

function putUpdateTldrWithId (req, res, next) {

  var id = req.params.id;

  if (!req.body) {
    return next({ statusCode: 400, body: { message: 'Body required in request' } } );
  }

  // We find by id here
  TldrModel.find({ _id: id }, function (err, docs) {
    internalUpdateCb(err, docs, req, res, next);
  });

}

/**
 * Handle All errors coming from next(err) calls
 *
 */

function handleErrors (err, req, res, next) {
  res.json(err.statusCode, err.body);
}

/**
 * Add necessary headers for CORS
 *
 */

function allowAccessOrigin (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
}

// Module interface
module.exports.getLatestTldrs = getLatestTldrs;
module.exports.getTldrById = getTldrById;
module.exports.searchTldrs = searchTldrs;
module.exports.putUpdateTldrWithId = putUpdateTldrWithId;
module.exports.postNewTldr = postNewTldr;
module.exports.handleErrors = handleErrors;
module.exports.allowAccessOrigin = allowAccessOrigin;
