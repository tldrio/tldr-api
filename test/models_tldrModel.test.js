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
					createdAt: new Date(),
					updatedAt: new Date()
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
				assert.equal(valErr.createdAt, null);

        done();
      });

    });

    it('should detect missing required createdAt and updatedAt args', function (done) {

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
				valErr.createdAt.should.not.equal(null);
				valErr.updatedAt.should.not.equal(null);

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

 

  describe('#createInstance', function () {


    it ("should calculate the correct id and hostname", function() {

      var tldr = TldrModel.createInstance({url: 'http://adomain.tld',
                                          summary: 'coin',
                                          resourceAuthor: 'bloup'})
        , niceErrors;

      tldr.hostname.should.equal('adomain.tld');
      tldr._id.should.equal('839f9a097256c214581548a39bb7840a27c242e2');

    });
    

    it('should allow user to set url, summary and resourceAuthor only', function () {

      // Test is coupled with createInstance because they are designed to work together
      var tldr = TldrModel.createInstance({url: "bla", summary: "coin", resourceAuthor: "bloup"});
      tldr.url.should.equal("bla");
      tldr.summary.should.equal("coin");
      tldr.resourceAuthor.should.equal("bloup");

      var tldr2 = TldrModel.createInstance({unusedField: "glok"});
      tldr2.should.not.have.property('unusedField');
      tldr2.should.not.have.property('summary');
      tldr2.should.not.have.property('resourceAuthor');
      tldr2.url.should.eql('');

    });

    it('should allow user to update summary and sourceAuthor only', function () {

      var tldr = TldrModel.createInstance({url: "bla", summary: "coin", resourceAuthor: "bloup"})
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

