/**
 * TldrModel tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , restify = require('restify')
  , sinon = require('sinon')
  , bunyan = require('../lib/logger').bunyan // Audit logger for restify
  , mongoose = require('mongoose') // Mongoose ODM to Mongo
  , models = require('../models')
  , db = require('../lib/db')
	, TldrModel = models.TldrModel
  , server = require('../server')
  , _u = require('underscore')
  , customErrors = require('../lib/errors');





/**
 * Tests
 */


describe('TldrModel', function () {

  describe('#validators', function () {

    before(function (done) {
      db.connectToDatabase(done);
    });

    after(function (done) {
      db.closeDatabaseConnection(done);
    });

    beforeEach(function (done) {
      TldrModel.remove( function (err) {
        if (err) {throw done(err);}
        done();
      });
    });

    it('should detect missing required _id arg', function (done) {

      var tldr = new TldrModel({
					url: 'needforair.com/nutcrackers',
					hostname: 'needforair.com',
					summary: 'Awesome Blog',
					dateCreated: new Date(),
					lastUpdated: new Date()
				})
        , valErr;

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
				
        _.keys(err.errors).length.should.equal(2);
				valErr = models.getAllValidationErrorsWithExplanations(err.errors);
				valErr._id.should.not.equal(null);
				valErr.url.should.not.equal(null);
				assert.equal(valErr.summary, null);
				assert.equal(valErr.hostname, null);
				assert.equal(valErr.dateCreated, null);

        done();
      });

    });

    it('should detect missing required dateCreated and lastUpdated args', function (done) {

      var tldr = new TldrModel({
					url: 'http://needforair.com/nutcrackers',
					_id: "aqaqaqaqaqaqaqaqaqaqzxzxzxzxzxzxzxzxzxzx",
					hostname: 'needforair.com',
					summary: 'Awesome Blog',
				})
				, valErr;

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
				
        _.keys(err.errors).length.should.equal(2);
				valErr = models.getAllValidationErrorsWithExplanations(err.errors);
				assert.equal(valErr.url, null);
				assert.equal(valErr._id, null);
				assert.equal(valErr.summary, null);
				assert.equal(valErr.hostname, null);
				valErr.dateCreated.should.not.equal(null);
				valErr.lastUpdated.should.not.equal(null);

        done();
      });

    });
    
    it('should detect missing required url arg', function (done) {

      var tldr = new TldrModel({
				_id: 'c63588884fecf318d13fc3cf3598b19f4f461d21',
				hostname: 'needforair.com',
				summary: 'Awesome Blog',
			});

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
        done();
      });

    });

    it('should detect missing required summary arg', function (done) {

      var tldr = new TldrModel({
        _id: 'c63588884fecf318d13fc3cf3598b19f4f461d21',
        url: 'needforair.com/nutcrackers',
        hostname: 'needforair.com',
      });

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
        done();
      });

    });

    it('should detect missing required hostname arg', function (done) {

      var tldr = new TldrModel({
        _id: 'c63588884fecf318d13fc3cf3598b19f4f461d21',
        url: 'needforair.com/nutcrackers',
        summary: 'Awesome Blog',
      });

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
        done();
      });

    });

    it('should detect bad hostname format', function (done) {

      var tldr = new TldrModel({
        _id: 'c63588884fecf318d13fc3cf3598b19f4f461d21',
        url: 'needforair.com/nutcrackers',
        hostname: 'needforair',
        summary: 'Awesome Blog',
      });

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
        done();
      });

    });

    it('should handle wrong type of arg', function (done) {

      var parasite = {foo: 'bar'}
        , tldr = new TldrModel({
            _id: 'c63588884fecf318d13fc3cf3598b19f4f461d21',
            url: 'http://needforair.com/nutcrackers',
            hostname: 'needforair.com',
            summary: parasite,
      });

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
        done();
      });

    });

    it('should handle wrong url formatting', function (done) {

      var tldr = new TldrModel({
        _id: 'c63588884fecf318d13fc3cf3598b19f4f461d21',
        url: 'needforair.com/nutcrackers',
        hostname: 'needforair.com',
        summary: 'Awesome Blog',
      });

      tldr.save( function (err) {
        err.name.should.equal('ValidationError');
        done();
      });

    });

  });

  describe("#craftInstance", function() {

    it("should not break if no url is given", function(done) {

      var tldr = new TldrModel({summary: "a summary"});
      assert.equal(null, tldr.url);

      tldr.craftInstance();
      tldr.url.should.equal("");
      assert.equal(null, tldr.hostname);

      tldr.save(function (err) {
        if (!err) {throw {}; }    // Shouldn't be able to save
      });

      done();
    });


    it ("should calculate the correct id and hostname", function(done) {

      var tldr = new TldrModel({url: "http://adomain.tld"})
        , niceErrors;
      assert.equal(null, tldr.hostname);

      tldr.craftInstance();

      tldr.hostname.should.equal("adomain.tld");
      tldr._id.should.equal("839f9a097256c214581548a39bb7840a27c242e2");

      // Only summary should be an error
      tldr.save(function(err) {
        niceErrors = models.getAllValidationErrorsWithExplanations(err.errors);
        if (!niceErrors.summary) {throw {};}
        assert.equal(niceErrors.url, null);
        assert.equal(niceErrors.hostname, null);
        assert.equal(niceErrors._id, null);
      });

      done();
    });

  });

  describe('#createAndCraftInstance', function () {

    it('should allow user to set url, summary and resourceAuthor only', function () {

      // Test is coupled with createAndCraftInstance because they are designed to work together
      var tldr = TldrModel.createAndCraftInstance({url: "bla", summary: "coin", resourceAuthor: "bloup"});
      tldr.url.should.equal("bla");
      tldr.summary.should.equal("coin");
      tldr.resourceAuthor.should.equal("bloup");

      var tldr2 = TldrModel.createAndCraftInstance({unusedField: "glok"});
      tldr2.should.not.have.property('unusedField');
      tldr2.should.not.have.property('summary');
      tldr2.should.not.have.property('resourceAuthor');
      tldr2.url.should.eql('');

    });

    it('should allow user to update summary and sourceAuthor only', function () {

      var tldr = TldrModel.createAndCraftInstance({url: "bla", summary: "coin", resourceAuthor: "bloup"})
        , toUpdate = {url: 'new1', summary: 'new2', resourceAuthor: 'new3', unusedField: 'new4'};

      tldr.url.should.equal("bla");
      tldr.summary.should.equal("coin");
      tldr.resourceAuthor.should.equal("bloup");

      // Perform update
      tldr.update(toUpdate);

      tldr.url.should.equal('bla');
      tldr.summary.should.equal('new2');
      tldr.resourceAuthor.should.equal('new3');
      tldr.should.not.have.property('unusedField');

    });

  });

});

