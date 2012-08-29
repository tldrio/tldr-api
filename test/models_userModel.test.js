/**
 * User tests
 * Copyright (C) 2012 L. Chatriot, S. Marion, C. Miglietti
 * Proprietary License
 */


var should = require('chai').should()
  , assert = require('chai').assert
  , _ = require('underscore')
  , i18n = require('../lib/i18n')
  , sinon = require('sinon')
  , mongoose = require('mongoose') // ODM for Mongo
  , models = require('../lib/models')
  , User = models.User
  , Tldr = models.Tldr
  , server = require('../server')
  , db = server.db
  , url = require('url')
  , bcrypt = require('bcrypt');



/**
 * Tests
 */


describe('User', function () {

  before(function (done) {
    db.connectToDatabase(done);
  });

  after(function (done) {
    db.closeDatabaseConnection(done);
  });

  beforeEach(function (done) {
    User.remove( function (err) {
      if (err) {throw done(err);}
      Tldr.remove( function(err) {
        if (err) {throw done(err);}
        done();
      });
    });
  });


  describe('#validators', function () {

    it('should not save a user that has no email', function (done) {
      var user = new User({ username: 'NFADeploy'
                           , usernameLowerCased: 'nfadeploy'
                           , password: 'supersecret!'
                           })
        , valErr;

      user.save(function(err) {
        err.name.should.equal('ValidationError');

        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        _.keys(err.errors).length.should.equal(1);
        valErr.email.should.equal('required');
        done();
      });
    });

    it('should not save a user that has no password', function (done) {
      var user = new User({ email: 'email@email.com'
                           , username: 'NFADeploy'
                           , usernameLowerCased: 'nfadeploy'
                               })
        , valErr;

      user.save(function(err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(1);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.password.should.equal('required');
        done();
      });
    });

    it('should not save a user that has no username', function (done) {
      var user = new User({ email: 'email@email.com'
                               , password: 'Axcxxname'
                               })
        , valErr;

      user.save(function(err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(2);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.username.should.equal('required');
        done();
      });
    });

    it('validate email address - email', function (done) {

      // Unit test the rule
      assert.isNull(User.validateEmail('noarobase'));
      assert.isNull(User.validateEmail('user@'));
      assert.isNull(User.validateEmail('user@domain'));
      assert.isNull(User.validateEmail('@domain.tld'));
      assert.isNotNull(User.validateEmail('user@domain.tld'));
      assert.isNotNull(User.validateEmail('firstname.name@subdomain.domain.tld'));

      // Test that it's well handled by Mongoose
      var userData = { password: 'supersecret!'
                     , username: 'NFADeploy'
                     , usernameLowerCased: 'nfadeploy'
                     , email: 'bademail'
                     }
        , valErr, user;

      user = new User(userData);
      user.save(function(err) {
        err.name.should.equal('ValidationError');
        _.keys(err.errors).length.should.equal(1);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.email.should.equal(i18n.validateUserEmail);
        done();
      });
    });

    it('should accepts usernames containing from 3 to 16 alphanumerical characters', function (done) {
      var user = new User({ email: 'email@email.com'
                               , password: 'supersecret!'
                               , username: 'Stevie_sTarAc1'
                               , usernameLowerCased: 'stevie_starac1'
                               })
        , valErr;

      //Unit test the rule (there is 31 characters in there)
      assert.isTrue(User.validateUsername('Stevie_sTarAc1'));

      // Check integration into Mongoose
      user.save(function(err) {

        assert.isNull(err);
        user.username = 'to';

        user.save(function(err) {
          err.name.should.equal('ValidationError');

          user.username = 'Cecin#estpas&un username valide!';
          user.save(function(err) {
            err.name.should.equal('ValidationError');

            _.keys(err.errors).length.should.equal(1);
            valErr = models.getAllValidationErrorsWithExplanations(err.errors);
            valErr.username.should.equal(i18n.validateUserName);
            done();
          });
        });
      });
    });

    it('should not validate a user whose password is too short', function (done) {
      var user = new User({ email: 'email@email.com'
                               , password: 'secre'
                               , username: 'NFADeploy'
                               , usernameLowerCased: 'nfadeploy'
                               })
        , valErr;

      //Unit test the rule
      assert.isFalse(User.validatePassword('secre'));

      // Check integration into Mongoose
      user.save(function(err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(1);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.password.should.equal(i18n.validateUserPwd);
        done();
      });
    });
  });



  describe('#createAndSaveInstance', function () {

    it('should not be able to save a user whose password is not valid', function (done) {
      var userData = { username: 'NFADeploy'
                     , password: 'short'
                     , email: 'valid@email.com'
                     }
        , valErr;

      User.createAndSaveInstance(userData, function(err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(1);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.password.should.equal(i18n.validateUserPwd);
        done();
      });
    });


    it('normalize email and username inputs', function (done) {
      var userData = { password: 'notTOOshort'
                     , email: '  vaLId@email.com'
                     , username: ' NFa '
                     };

      User.createAndSaveInstance(userData, function(err) {
        assert.isNull(err);

        User.find({email: 'valid@email.com'}, function(err, docs) {
          docs.should.have.length(1);
          User.find({username: 'NFa'}, function(err, docs) {
            docs.should.have.length(1);

            done();
          });
        });
      });
    });

    it('should save a user whose password is valid and set default validationStatus', function (done) {
      var userData = { username: 'NFADeploy'
                     , password: 'notTOOshort'
                     , email: 'valid@email.com'
                     };

      User.createAndSaveInstance(userData, function(err, user) {
        assert.isNull(err);
        user.confirmedEmail.should.be.false;

        User.find({email: 'valid@email.com'}, function(err, docs) {
          docs.should.have.length(1);

          // compareSync used here since these are tests. Do not use in production
          bcrypt.compareSync('notTOshort', docs[0].password).should.equal(false);
          bcrypt.compareSync('notTOOshort', docs[0].password).should.equal(true);
          bcrypt.compareSync('notTOOOshort', docs[0].password).should.equal(false);

          docs[0].username.should.equal("NFADeploy");

          done();
        });
      });
    });

    it('should not save a user with the same email or the same username twice', function (done) {
      var userData = { username: 'NFADeploy'
                     , password: 'notTOOshort'
                     , email: 'valid@email.com'
                     }
        , userData2 = { username: 'nfadEPLOY'
                     , password: 'NOTtooshort'
                     , email: 'anothervalid@email.com'
                     }
        , userData3 = { username: 'lameredetoto'
                     , password: 'notTooSHORt'
                     , email: 'valid@email.com'
                     }
        , usersNumber;

      User.createAndSaveInstance(userData, function(err) {
        assert.isNull(err);
        User.find({}, function (err, docs) {
          usersNumber = docs.length;

          // Try to save a user with the same email

          User.createAndSaveInstance(userData3, function(err) {
            err.code.should.equal(11000);   // Duplicate key

            // Try to save a user with the same username (except case sentivity)
            User.createAndSaveInstance(userData2, function(err) {
              err.code.should.equal(11000);   // Duplicate key

              User.find({}, function (err, docs) {
                docs.length.should.equal(usersNumber);
                done();
              });
            });
          });
        });
      });
    });

    it('should only save the authorized user fields', function (done) {
      var userData = { username: 'NFADeploy'
                     , password: 'notTOOshort'
                     , email: 'another@email.com'
                     , nonValidField: 'some value'
                     };
      // Try to save data with a non authorized field that will not be saved
      User.createAndSaveInstance(userData, function(err) {
        assert.isNull(err);
        User.find({email: 'another@email.com'}, function(err, docs) {
          docs.should.have.length(1);
          assert.isUndefined(docs[0].nonValidField);

          done();
        });
      });
    });

    it('should save a user whose password is valid', function (done) {
      var userData = { username: 'NFADeploy'
                     , password: 'notTOOshort'
                     , email: 'valid@email.com'
                     }
        , sessionUsableFields;

      User.createAndSaveInstance(userData, function(err) {
        assert.isNull(err);

        User.find({email: 'valid@email.com'}, function(err, docs) {
          docs.should.have.length(1);
          sessionUsableFields = docs[0].getAuthorizedFields();

          assert.isDefined(sessionUsableFields.username);
          assert.isDefined(sessionUsableFields.email);
          assert.isUndefined(sessionUsableFields.password);

          done();
        });
      });
    });

  });


  describe('#getCreatedTldrs', function() {

    it('Should return the array of saved tldrs if there are some and populate only the username of the creator', function (done) {
      var userData = { username: 'NFADeploy'
                     , email: 'valid@email.com'
                     , password: 'supersecret!'
                     }
        , tldrData1 = { url: 'http://myfile.com/movie',
                       title: 'Blog NFA',
                       summaryBullets: ['Awesome Blog'],
                       resourceAuthor: 'NFA Crew',
                       resourceDate: '2012',
                       createdAt: new Date(),
                       updatedAt: new Date()
                     }
        , tldrData2 = { url: 'http://another.com/movie',
                       title: 'Blog NFA',
                       summaryBullets: ['Awesome Blog', 'Another bullet'],
                       resourceAuthor: 'NFA Crew',
                       resourceDate: '2012',
                       createdAt: new Date(),
                       updatedAt: new Date()
                     };

      User.createAndSaveInstance(userData, function(err, user) {
        user.getCreatedTldrs(function(tldrs) {
          _.isArray(tldrs).should.equal(true);
          tldrs.length.should.equal(0);

          Tldr.createAndSaveInstance(tldrData1, function(err, tldr1) {
            Tldr.createAndSaveInstance(tldrData2, function(err, tldr2) {
              models.setTldrCreator(tldr1, user, function(err) {
                models.setTldrCreator(tldr2, user, function(err) {
                  // user doesn't contain the data in his created tldrs
                  assert.isUndefined(user.tldrsCreated[0].url);

                  user.getCreatedTldrs(function(tldrs) {
                    tldrs[1].url.should.equal('http://myfile.com/movie');
                    tldrs[0].url.should.equal('http://another.com/movie');
                    tldrs[0].creator.username.should.equal('NFADeploy');
                    assert.isUndefined(tldrs[0].creator.password);

                    done();
                  });
                });
              });
            });
          });
        });
      });
    });

  });


  describe('#updatePassword', function() {
    it('should call callback with correct error messages if password can\'t be updated', function (done) {
      var userData = { username: 'NFADeploy'
                     , password: 'notTOOshort'
                     , email: 'valid@email.com'
                     };

      User.createAndSaveInstance(userData, function(err, user) {
        assert.isNull(err);

        user.updatePassword('incorrect', 'goodpassword', function(err) {
          assert.isDefined(err.oldPassword);
          assert.isUndefined(err.newPassword);

          user.updatePassword('notTOOshort', 'badpw', function(err) {
            assert.isUndefined(err.oldPassword);
            assert.isDefined(err.newPassword);

            user.updatePassword('badpw', 'badpw', function(err) {
              assert.isDefined(err.oldPassword);
              assert.isDefined(err.newPassword);

              done();
            });
          });
        });
      });
    });

    it('should throw if one or both parameters are missing', function (done) {
      var userData = { username: 'NFADeploy'
                     , password: 'notTOOshort'
                     , email: 'valid@email.com'
                     };

      User.createAndSaveInstance(userData, function(err, user) {
        assert.isNull(err);

        function testFunc1 () {user.updatePassword(null, 'aaaaaa');}
        function testFunc2 () {user.updatePassword('aaaaaa');}
        function testFunc3 () {user.updatePassword();}
        testFunc1.should.throw();
        testFunc2.should.throw();
        testFunc3.should.throw();
        done();
      });
    });

    it('should update password if oldone matches and new one is valid', function (done) {
      var userData = { username: 'NFADeploy'
                     , password: 'notTOOshort'
                     , email: 'valid@email.com'
                     };

      User.createAndSaveInstance(userData, function(err, user) {
        assert.isNull(err);

        user.updatePassword('notTOOshort', 'goodpassword', function(err) {
          assert.isNull(err);
          bcrypt.compareSync('goodpassword', user.password).should.equal(true);
          bcrypt.compareSync('notTOOshort', user.password).should.equal(false);

          done();
        });
      });
    });

  });


  describe('should update the user updatable fields (email and username)', function() {
    it('should update the fields if they pass validation', function (done) {
      var userData = { username: 'NFADeploy'
                     , password: 'notTOOshort'
                     , email: 'valid@email.com'
                     }
        , newData = { username: 'NFAMasterDeploy'
                    , password: 'anothergood'
                    , email: 'another@valid.com'};

      User.createAndSaveInstance(userData, function(err, user) {
        assert.isNull(err);
        user.username.should.equal("NFADeploy");
        user.email.should.equal("valid@email.com");
        bcrypt.compareSync('notTOOshort', user.password).should.equal(true);

        user.updateValidFields(newData, function(err, user2) {
          user2.username.should.equal("NFAMasterDeploy");
          user2.email.should.equal("another@valid.com");
          bcrypt.compareSync('notTOOshort', user2.password).should.equal(true);

          done();
        });
      });
    });

    it('should NOT update the fields if they DON\'T pass validation', function (done) {
      var userData = { username: 'NFADeploy'
                     , password: 'notTOOshort'
                     , email: 'valid@email.com'
                     }
        , newData = { username: 'edhdhdshdshsdhsdhdshdfshfsdhfshfshfshfsdhsfdhfshsfdhshsfhsfdhshhfsdhfsdh'
          , password: 'anothergood'
          , email: 'another@valid.com'};

      User.createAndSaveInstance(userData, function(err, user) {
        assert.isNull(err);
        user.username.should.equal("NFADeploy");
        user.email.should.equal("valid@email.com");

        assert.isNull(err);

        user.updateValidFields(newData, function(err, user3) {
          assert.isNotNull(err.username);

          done();
        });
      });
    });

    it('should update the fields only if the unique constraint is respected', function (done) {
      var userData = { username: 'NFADeploy'
                     , password: 'notTOOshort'
                     , email: 'valid@email.com'
                     }
        , anotherData = { username: 'ANOTHER'
                        , password: 'nottooshort'
                        , email: 'again@email.com'
                        }
        , newData = { username: 'nfadEPLoy'   // Same as userData
                    , password: 'anothergood'
                    , email: 'VAlid@EMail.com'};   // Same as userData

      User.createAndSaveInstance(userData, function(err, user) {
        assert.isNull(err);

        User.createAndSaveInstance(anotherData, function(err, user2) {
          assert.isNull(err);

          // If we update the unique fields to the same value they had, Mongoose understand it is the same
          // document and raises no error
          user.updateValidFields(newData, function(err, user4) {
            assert.isNull(err);

            // The 'unique' constraint prevents from updating if it creates a conflict
            newData.username = "ANOTher";
            user.updateValidFields(newData, function(err, user5) {
              err.code.should.equal(11001);   // Duplicate key while updating
              newData.username = "UntakenUsersame";
              newData.email = "again@email.com";
              user.updateValidFields(newData, function(err, user5) {
                err.code.should.equal(11001);   // Duplicate key while updating
                done();
              });
            });
          });
        });
      });
    });

  });


  describe('Reset password functions', function() {
    it('Should create a reset password token that expires within one hour', function (done) {
      var user = new User({ email: 'email@email.com'
                               , password: 'supersecret!'
                               , username: 'Stevie_sTarAc1'
                               , usernameLowerCased: 'stevie_starac1'
                               });

      user.save(function(err) {
        assert.isNull(err);
        assert.isUndefined(user.resetPasswordToken);
        assert.isUndefined(user.resetPasswordTokenExpiration);

        user.createResetPasswordToken(function(err) {
          assert.isNull(err);

          assert.isDefined(user.resetPasswordToken);
          assert.isDefined(user.resetPasswordTokenExpiration);

          // The token should expire within an hour, we test that with a tolerance of 5 seconds
          assert.isTrue(user.resetPasswordTokenExpiration - new Date() >= 3595000);
          assert.isTrue(user.resetPasswordTokenExpiration - new Date() <= 3600000);

          done();
        });
      });
    });

    it('Should never create a different token every time', function (done) {
      var user = new User({ email: 'email@email.com'
                               , password: 'supersecret!'
                               , username: 'Stevie_sTarAc1'
                               , usernameLowerCased: 'stevie_starac1'
                               })
               , token;

      user.save(function(err) {
        assert.isNull(err);
        assert.isUndefined(user.resetPasswordToken);
        assert.isUndefined(user.resetPasswordTokenExpiration);

        user.createResetPasswordToken(function(err) {
          assert.isNull(err);

          assert.isDefined(user.resetPasswordToken);
          token = user.resetPasswordToken

          user.createResetPasswordToken(function(err) {
            assert.isNull(err);

            assert.isDefined(user.resetPasswordToken);
            user.resetPasswordToken.should.not.equal(token);

            done();
          });
        });
      });
    });

    it('Should not reset password if token is invalid', function (done) {
      var user = new User({ email: 'email@email.com'
                               , password: 'supersecret!'
                               , username: 'Stevie_sTarAc1'
                               , usernameLowerCased: 'stevie_starac1'
                               });

      user.save(function(err) {
        assert.isNull(err);

        user.createResetPasswordToken(function(err) {
          user.resetPassword('notatoken', 'perfectlygoodpassword', function(err) {
            err.tokenInvalidOrExpired.should.equal(true);
            done();
          });
        });
      });
    });

    it('Should not reset password if token is expired', function (done) {
      var user = new User({ email: 'email@email.com'
                               , password: 'supersecret!'
                               , username: 'Stevie_sTarAc1'
                               , usernameLowerCased: 'stevie_starac1'
                               });

      user.save(function(err) {
        assert.isNull(err);

        user.createResetPasswordToken(function(err) {
          // Fast-forward time a bit ...
          user.resetPasswordTokenExpiration.setTime(user.resetPasswordTokenExpiration.getTime() - 3605000);
          user.save(function(err) {
            assert.isNull(err);

            user.resetPassword(user.resetPasswordToken, 'perfectlygoodpassword', function(err) {
              err.tokenInvalidOrExpired.should.equal(true);
              done();
            });
          });
        });
      });
    });

    it('Should not reset password if new password is invalid', function (done) {
      var user = new User({ email: 'email@email.com'
                               , password: 'supersecret!'
                               , username: 'Stevie_sTarAc1'
                               , usernameLowerCased: 'stevie_starac1'
                               });

      user.save(function(err) {
        assert.isNull(err);

        user.createResetPasswordToken(function(err) {
          assert.isNull(err);

          user.resetPassword(user.resetPasswordToken, 'bad', function(err) {
            assert.isDefined(models.getAllValidationErrorsWithExplanations(err.errors).password);
            done();
          });
        });
      });
    });

    it('Should reset password if token and new password are valid', function (done) {
      var user = new User({ email: 'email@email.com'
                               , password: 'supersecret!'
                               , username: 'Stevie_sTarAc1'
                               , usernameLowerCased: 'stevie_starac1'
                               });

      user.save(function(err) {
        assert.isNull(err);

        user.createResetPasswordToken(function(err) {
          assert.isNull(err);

          user.resetPassword(user.resetPasswordToken, 'goodpassword', function(err) {
            assert.isNull(err);

            // Token is reinitialized
            assert.isNull(user.resetPasswordToken);
            assert.isNull(user.resetPasswordTokenExpiration);
            bcrypt.compareSync('supersecret!', user.password).should.equal(false);
            bcrypt.compareSync('goodpassword', user.password).should.equal(true);
            done();
          });
        });
      });
    });




  });



});
