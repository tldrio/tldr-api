/**
 * Cryptographic Tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Fucking Proprietary License
 */

//OpenSSL must be installed in the environment
var crypto = require('crypto')
  , should = require('chai').should()
  , assert = require('chai').assert;


describe('Crypto Module', function () {
  it('should compute sha1 hash', function () {
    //I use Hungarian Notation
    //h stands for hashed 
    var url = 'needforair.com'
      , hUrl
      , sha1 = crypto.createHash('sha1');

    sha1.update(url, 'utf8');
    hUrl = sha1.digest('hex');
    hUrl.should.equal('f795b55c5888074df9b9005b4583ece878f40f4a');

    url = 'avc.com';
    sha1 = crypto.createHash('sha1');
    sha1.update(url, 'utf8');
    hUrl = sha1.digest('hex');
    hUrl.should.equal('baeb9ec841ed3311ad7bf2b85272c3ba3517a029');

    url = 'bothsidesofthetable.com';
    sha1 = crypto.createHash('sha1');
    sha1.update(url, 'utf8');
    hUrl = sha1.digest('hex');
    hUrl.should.equal('9c1e9eb4748ee33be23211988acc2f8cf83b33cd');
  });
});

