/**
 * models tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , restify = require('restify')
  , sinon = require('sinon')
  , bunyan = require('../lib/logger').bunyan // Audit logger for restify
  , mongoose = require('mongoose') // Mongoose ODM to Mongo
  , models = require('../models')
  , db = require('../lib/db')
	, TldrModel = models.TldrModel
  , server = require('../server')
  , customErrors = require('../lib/errors');





/**
 * Tests
 */

describe("models.acceptableUserInput", function() {
  it('should accept the correct properties', function(done) {
    var test = models.acceptableUserInput.call(TldrModel, {url: "ttt", summary: "res"});

    test.url.should.equal("ttt");
    test.summary.should.equal("res");

    done();
  });

  it('should fail if called with a null this context', function(done) {
    (function () { var test = models.acceptableUserInput.call(null, {url: "rrr"}); }).should.throw();

    done();
  });

  it('should not use non user modifiable input', function(done) {
    var test = models.acceptableUserInput.call(TldrModel, { summary: "res", donotuseit: "rrrr"});

    assert.equal(null, test.url);
    test.summary.should.equal("res");
    assert.equal(null, test.donotuseit);

    done();
  });


});

