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

describe('Models', function() {
  describe('#AcceptableUserInput', function () {
    it('should accept the correct properties', function() {
      var test = models.acceptableUserInput.call(TldrModel, {url: "ttt", summary: "res"});

      test.url.should.equal("ttt");
      test.summary.should.equal("res");

    });


    it('should not use non user modifiable input', function() {
      var test = models.acceptableUserInput.call(TldrModel, { summary: "res", donotuseit: "rrrr"});

      assert.equal(null, test.url);
      test.summary.should.equal("res");
      assert.equal(null, test.donotuseit);

    });
  });
  


});

