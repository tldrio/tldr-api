/**
 * APIClient model test
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , i18n = require('../lib/i18n')
  , models = require('../lib/models')
  , APIClient = models.APIClient
  , config = require('../lib/config')
  , DbObject = require('../lib/db')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort)
  , async = require('async');


describe('APIClient Model', function () {
  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    APIClient.remove({}, done);
  });


  describe('createAndSaveInstance', function () {

    it('Should refuse to create one if name is not between 1 and 20 characters', function (done) {
      var apicData = { key: 'akey' };

      APIClient.createAndSaveInstance(apicData, function (err) {
        _.keys(err.errors).length.should.equal(1);
        models.getAllValidationErrorsWithExplanations(err.errors).name.should.equal(i18n.validateAPIClientName);

        apicData = { name: 'ee', key: 'akey' };
        APIClient.createAndSaveInstance(apicData, function (err) {
          _.keys(err.errors).length.should.equal(1);
          models.getAllValidationErrorsWithExplanations(err.errors).name.should.equal(i18n.validateAPIClientName);

          apicData = { name: 'eeeeeeeeeeeeeeeeeeeee', key: 'akey' };
          APIClient.createAndSaveInstance(apicData, function (err) {
            _.keys(err.errors).length.should.equal(1);
            models.getAllValidationErrorsWithExplanations(err.errors).name.should.equal(i18n.validateAPIClientName);

            done();
          });
        });
      });
    });

    it('Shouldn\'t create an API client without a key', function (done) {
      APIClient.createAndSaveInstance({ name: 'bloup' }, function (err, apic) {
        _.keys(err.errors).length.should.equal(1);
        assert.isDefined(models.getAllValidationErrorsWithExplanations(err.errors).key);

        done();
      });
    });

    it('Should create an API client if the name is of correct length and key exists', function (done) {
      APIClient.createAndSaveInstance({ name: 'bloup', key: 'aakkeeyy' }, function (err, apic) {
        assert.isNull(err);
        apic.name.should.equal('bloup');
        apic.key.should.equal('aakkeeyy');

        done();
      });
    });

  });   // ==== End of 'createAndSaveInstance' ==== //


  describe('#incrementRouteUsage', function () {

    it('Can increment a route usage counter multiple times', function (done) {
      APIClient.createAndSaveInstance({ name: 'louisc', key: 'akey' }, function (err, apic) {
        apic.incrementRouteUsage('youpla', function() {
          APIClient.findOne({ _id: apic._id }, function (err, apic) {
            apic.routeUsage.youpla.should.equal(1);
            apic.incrementRouteUsage('youpla', function() {
              APIClient.findOne({ _id: apic._id }, function (err, apic) {
                apic.routeUsage.youpla.should.equal(2);
                apic.incrementRouteUsage('youpla', function() {
                  APIClient.findOne({ _id: apic._id }, function (err, apic) {
                    apic.routeUsage.youpla.should.equal(3);
                    done();
                  });
                });
              });
            });
          });
        });
      });
    });

    it('Create a route usage counter and set it to 1 if it didn\'t exist', function (done) {
      APIClient.createAndSaveInstance({ name: 'louisc', key: 'akey' }, function (err, apic) {
        apic.incrementRouteUsage('youpla', function() {
          APIClient.findOne({ _id: apic._id }, function (err, apic) {
            apic.routeUsage.youpla.should.equal(1);
            assert.isUndefined(apic.routeUsage.boum);
            apic.incrementRouteUsage('boum', function() {
              APIClient.findOne({ _id: apic._id }, function (err, apic) {
                apic.routeUsage.boum.should.equal(1);
                done();
              });
            });
          });
        });
      });
    });

    it('Should accept forward slashes in the route names', function (done) {
      APIClient.createAndSaveInstance({ name: 'louisc', key: 'akey' }, function (err, apic) {
        apic.incrementRouteUsage('youpla/boum', function() {
          APIClient.findOne({ _id: apic._id }, function (err, apic) {
            apic.routeUsage['youpla/boum'].should.equal(1);
            apic.incrementRouteUsage('youpla/boum', function() {
              APIClient.findOne({ _id: apic._id }, function (err, apic) {
                apic.routeUsage['youpla/boum'].should.equal(2);
                done();
              });
            });
          });
        });
      });
    });

  });   // ==== End of '#incrementRouteUsage' ==== //

});
