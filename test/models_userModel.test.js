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
  , UserHistory = models.UserHistory
  , Tldr = models.Tldr
  , server = require('../server')
  , db = server.db
  , url = require('url')
  , bcrypt = require('bcrypt')
  , async = require('async');



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
                           , history: '111111111111111111111111'   // Dummy history since it is required
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
                           , history: '111111111111111111111111'   // Dummy history since it is required
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
                               , history: '111111111111111111111111'   // Dummy history since it is required
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
      assert.isFalse(User.validateEmail('noarobase'));
      assert.isFalse(User.validateEmail('user@'));
      assert.isFalse(User.validateEmail('user@domain'));
      assert.isFalse(User.validateEmail('@domain.tld'));
      assert.isTrue(User.validateEmail('user@domain.tld'));
      assert.isTrue(User.validateEmail('firstname.name@subdomain.domain.tld'));

      // Test that it's well handled by Mongoose
      var userData = { password: 'supersecret!'
                     , username: 'NFADeploy'
                     , usernameLowerCased: 'nfadeploy'
                     , email: 'bademail'
                     , history: '111111111111111111111111'   // Dummy history since it is required
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
                               , history: '111111111111111111111111'   // Dummy history since it is required
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
                               , history: '111111111111111111111111'   // Dummy history since it is required
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
  });   // ==== End of '#validators' ==== //



  describe('#createAndSaveInstance', function () {

    it('should not be able to save a user whose password is not valid', function (done) {
      var userData = { username: 'NFADeploy'
                     , password: 'short'
                     , email: 'valid@email.com'
                     }
        , valErr;

      User.createAndSaveInstance(userData, function(err) {
        err.name.should.equal('ValidationError');

        _.keys(err.errors).length.should.equal(2);
        valErr = models.getAllValidationErrorsWithExplanations(err.errors);
        valErr.password.should.equal(i18n.validateUserPwd);
        assert.isDefined(valErr.history);   // History set only if password is valid
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

    it('should set default createdAt, updatedAt, lastActive and history', function (done) {
      var userData = { username: 'NFADeploy'
                     , password: 'notTOOshort'
                     , email: 'valid@email.com'
                     }
        , sessionUsableFields;

      User.createAndSaveInstance(userData, function(err, user) {
        assert.isNull(err);
        assert.isDefined(user.createdAt);
        assert.isDefined(user.lastActive);
        assert.isDefined(user.updatedAt);
        assert.isDefined(user.history);

        UserHistory.findOne({ _id: user.history }, function(err, history) {
          history.actions[0].type.should.equal("accountCreation");
          done();
        });
      });
    });

  });   // ==== End of '#createAndSaveInstance' ==== //


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

          Tldr.createAndSaveInstance(tldrData1, user, function(err, tldr1) {
            Tldr.createAndSaveInstance(tldrData2, user,  function(err, tldr2) {
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

  });   // ==== End of '#getCreatedTldrs' ==== //


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

  });   // ==== End of 'update password' ==== //


  describe('#saveAction as a wrapper around UserHistory.saveAction', function () {

    it('For a normally created user, saveAction should simply save a new action', function (done) {
      var userData = { username: 'NFADeploy'
                     , password: 'notTOOshort'
                     , email: 'valid@email.com'
                     };

      User.createAndSaveInstance(userData, function(err, user) {
        user.saveAction("action 1", "data 1", function() {
          user.saveAction("action 2", "data 2", function(err, history) {
            history.actions[0].type.should.equal('action 2');
            history.actions[0].data.should.equal('data 2');
            history.actions[1].type.should.equal('action 1');
            history.actions[1].data.should.equal('data 1');
            done();
          });
        });
      });
    });

  });   // ==== End of '#saveAction' ==== //


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

  });   // ==== End of 'should update the user updatable fields' ==== //


  describe('Reset password functions', function() {
    it('Should create a reset password token that expires within one hour', function (done) {
      var user = new User({ email: 'email@email.com'
                               , password: 'supersecret!'
                               , username: 'Stevie_sTarAc1'
                               , usernameLowerCased: 'stevie_starac1'
                               , history: '111111111111111111111111'   // Dummy history since it is required
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

    it('Should create a different token every time', function (done) {
      var user = new User({ email: 'email@email.com'
                               , password: 'supersecret!'
                               , username: 'Stevie_sTarAc1'
                               , usernameLowerCased: 'stevie_starac1'
                               , history: '111111111111111111111111'   // Dummy history since it is required
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
                               , history: '111111111111111111111111'   // Dummy history since it is required
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
                               , history: '111111111111111111111111'   // Dummy history since it is required
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
                               , history: '111111111111111111111111'   // Dummy history since it is required
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
                               , history: '111111111111111111111111'   // Dummy history since it is required
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

  });   // ==== End of 'reset password functions' ==== //


  describe('XSS prevention', function() {

    it('Should sanitize all user-inputed fields and the fields derived from user input when saving with createAndSaveInstance', function (done) {
      var userInput = { email: 'ema-moz-bindingil@email.com'
                               , password: 'supersecret!'
                               , username: 'Stevie_sTar-moz-bindingAc1'
                               , usernameLowerCased: 'veryBAD document.write'   // XSS try should fail even though this field is not directly sanitized because
                                                                                // it is derived from username
                               };

      User.createAndSaveInstance(userInput, function(err, theUser) {
        theUser.email.should.equal('email@email.com');
        theUser.username.should.equal('Stevie_sTarAc1');
        theUser.usernameLowerCased.should.equal('stevie_starac1');

        done();
      });
    });

    it('Should sanitize all user-inputed fields and the fields derived from user input when updating', function (done) {
      var goodUserInput = { email: 'blip@email.com'
                               , password: 'supersecret!'
                               , username: 'quelquun'
                               };
      var userInput = { email: 'ema-moz-bindingil@email.com'
                               , username: 'Stevie_sTar-moz-bindingAc1'
                               , usernameLowerCased: 'veryBAD document.write'   // XSS try should fail even though this field is not directly sanitized because
                                                                                // it is derived from username
                               };

      User.createAndSaveInstance(goodUserInput, function(err, user) {
        user.updateValidFields(userInput, function (err, theUser) {
          theUser.email.should.equal('email@email.com');
          theUser.username.should.equal('Stevie_sTarAc1');
          theUser.usernameLowerCased.should.equal('stevie_starac1');

          done();
        });
      });
    });

  });   // ==== End of 'XSS prevention' ==== //


  describe('Admin role', function () {

    it('Louis Charles and Stan and their fake accounts are admins and no other', function (done) {
      var userData1 = { email: "louis.chatriot@gmail.com", username: "LCzzz", password: "supersecret" }
        , userData2 = { email: "stanislas.marion@gmail.com", username: "SMzzz", password: "supersecret" }
        , userData3 = { email: "charles@tldr.io", username: "CMzzz", password: "supersecret" }
        , userData4 = { email: "rebecca.black@gmail.com", username: "RBzzz", password: "supersecret" }

        // Fake accounts created on the basis of Louis' account
        , userData5 = { email: "louis.chatrio.t@gmail.com", username: "LCzzz1", password: "supersecret" }
        , userData6 = { email: "lo.uis.chatriot@gmail.com", username: "LCzzz2", password: "supersecret" }
        , userData7 = { email: "louis.cha.triot@gmail.com", username: "LCzzz3", password: "supersecret" }
        , userData8 = { email: "loui.s.chatriot@gmail.com", username: "LCzzz4", password: "supersecret" }
        , userData9 = { email: "l.ouis.chatriot@gmail.com", username: "LCzzz5", password: "supersecret" }

        // Fake accounts created on the basis of Louis' account
        , userData10 = { email: "c.harles.miglietti@gmail.com", username: "CMzzzz1", password: "supersecret" }
        , userData11 = { email: "charles@needforair.com", username: "CMzzz2", password: "supersecret" }
        , userData12 = { email: "charles.miglietti@gmail.com", username: "CMzzz3", password: "supersecret" }
        , userData18 = { email: "char.les.miglietti@gmail.com", username: "CMzzz4", password: "supersecret" }
        , userData19 = { email: "ch.arles.miglietti@gmail.com", username: "CMzzz5", password: "supersecret" }
        , userData20 = { email: "cha.rles.miglietti@gmail.com", username: "CMzzz6", password: "supersecret" }

        // Fake accounts created on the basis of Louis' account
        , userData13 = { email: "stan@tldr.io", username: "SMzzz1", password: "supersecret" }
        , userData14 = { email: "s.tanislas.marion@gmail.com", username: "SMzzz2", password: "supersecret" }
        , userData15 = { email: "st.anislas.marion@gmail.com", username: "SMzzz3", password: "supersecret" }
        , userData16 = { email: "sta.nislas.marion@gmail.com", username: "SMzzz4", password: "supersecret" }
        , userData17 = { email: "stan.islas.marion@gmail.com", username: "SMzzz5", password: "supersecret" }
        , users = {};

      // Create a user according to userData and store him in the users object
      function createUser (userData, name, cb) { User.createAndSaveInstance(userData, function(err, user) { users[name] = user; return cb(err); }); }

      async.waterfall([
        async.apply(createUser, userData1, 'lc')
      , async.apply(createUser, userData2, 'sm')
      , async.apply(createUser, userData3, 'cm')
      , async.apply(createUser, userData4, 'rb')

        // Fake users based on Louis' account
      , async.apply(createUser, userData5, 'lc1')
      , async.apply(createUser, userData6, 'lc2')
      , async.apply(createUser, userData7, 'lc3')
      , async.apply(createUser, userData8, 'lc4')
      , async.apply(createUser, userData9, 'lc5')

        // Fake users based on Charles' account
      , async.apply(createUser, userData10, 'cm1')
      , async.apply(createUser, userData11, 'cm2')
      , async.apply(createUser, userData12, 'cm3')
      , async.apply(createUser, userData18, 'cm4')
      , async.apply(createUser, userData19, 'cm5')
      , async.apply(createUser, userData20, 'cm6')

        // Fake users based on Stan' account
      , async.apply(createUser, userData13, 'sm1')
      , async.apply(createUser, userData14, 'sm2')
      , async.apply(createUser, userData15, 'sm3')
      , async.apply(createUser, userData16, 'sm4')
      , async.apply(createUser, userData17, 'sm5')

      , function (cb) {
          users.lc.isAdmin().should.equal(true);
          users.sm.isAdmin().should.equal(true);
          users.cm.isAdmin().should.equal(true);
          users.rb.isAdmin().should.equal(false);

          // Fake accounts based on Louis' should be admins too
          users.lc1.isAdmin().should.equal(true);
          users.lc2.isAdmin().should.equal(true);
          users.lc3.isAdmin().should.equal(true);
          users.lc4.isAdmin().should.equal(true);
          users.lc5.isAdmin().should.equal(true);

          // Fake accounts based on Charles' should be admins too
          users.cm1.isAdmin().should.equal(true);
          users.cm2.isAdmin().should.equal(true);
          users.cm3.isAdmin().should.equal(true);
          users.cm4.isAdmin().should.equal(true);
          users.cm5.isAdmin().should.equal(true);
          users.cm6.isAdmin().should.equal(true);

          // Fake accounts based on Stan' should be admins too
          users.sm1.isAdmin().should.equal(true);
          users.sm2.isAdmin().should.equal(true);
          users.sm3.isAdmin().should.equal(true);
          users.sm4.isAdmin().should.equal(true);
          users.sm5.isAdmin().should.equal(true);

          cb();
        }
      ], done);
    });


  });   // ==== End of 'Admin role' ==== //



});
