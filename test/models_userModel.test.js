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
  , ObjectId = mongoose.Schema.ObjectId
  , models = require('../lib/models')
  , Credentials = models.Credentials
  , User = models.User
  , DeletedUsersData = models.DeletedUsersData
  , UserHistory = models.UserHistory
  , notificator = require('../lib/notificator')
  , Tldr = models.Tldr
  , config = require('../lib/config')
  , DbObject = require('../lib/db')
  , db = new DbObject(config.dbHost, config.dbName, config.dbPort)
  , url = require('url')
  , bcrypt = require('bcrypt')
  , async = require('async')
  , user1, user2, tldr1, tldr2, tldr3;



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
    var userData1 = { email: "test1@email.com"
                    , password: "supersecret"
                    , username: "usertest1"
                    }
      , userData2 = { email: "test2@email.com"
                    , password: "supersecret"
                    , username: "usertest2"
                    }
      , tldrData1 = {url: 'http://needforair.com/nutcrackers', title:'nutcrackers', summaryBullets: ['Awesome Blog'], resourceAuthor: 'Charles', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()}
      , tldrData2 = {url: 'http://avc.com/mba-monday', title:'mba-monday', summaryBullets: ['Fred Wilson is my God'], resourceAuthor: 'Fred', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()}
      , tldrData3 = {url: 'http://bothsidesofthetable.com/deflationnary-economics', title: 'deflationary economics', summaryBullets: ['Sustering is my religion'], resourceAuthor: 'Mark', resourceDate: new Date(), createdAt: new Date(), updatedAt: new Date()}
      ;

    function theRemove(collection, cb) { collection.remove({}, function(err) { cb(err); }); }   // Remove everything from collection

    async.waterfall([
      async.apply(theRemove, Credentials)
    , async.apply(theRemove, User)
    , async.apply(theRemove, DeletedUsersData)
    , async.apply(theRemove, Tldr)
    , function (cb) { User.createAndSaveInstance(userData1, function (err, u1) { user1 = u1; cb(); }); }
    , function (cb) { User.createAndSaveInstance(userData2, function (err, u2) { user2 = u2; cb(); }); }
    , function (cb) { Tldr.createAndSaveInstance(tldrData1, user1, function (err, t1) { tldr1 = t1; cb(); }); }
    , function (cb) { Tldr.createAndSaveInstance(tldrData2, user1, function (err, t2) { tldr2 = t2; cb(); }); }
    , function (cb) { Tldr.createAndSaveInstance(tldrData3, user1, function (err, t3) { tldr3 = t3; cb(); }); }
    ], done);

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

    it('should not save a user that has a reserved username', function (done) {
      var userData = { email: 'email@email.com'
                               , username: 'index'
                               , password: 'Axcxxname'
                               , history: '111111111111111111111111'   // Dummy history since it is required
                               }
        , valErr;

      function testUsername (username, cb) {
        userData.username = username;
        User.createAndSaveInstance(userData, function(err) {
          err.name.should.equal('ValidationError');

          _.keys(err.errors).length.should.equal(1);
          valErr = models.getAllValidationErrorsWithExplanations(err.errors);
          valErr.username.should.equal(i18n.validateUserNameNotReserved);
          cb();
        });
      }

      // Test all reserved routes
      async.waterfall([
        async.apply(testUsername, 'confirm')
      , async.apply(testUsername, 'users')
      , async.apply(testUsername, 'tldrs')
      , async.apply(testUsername, 'about')
      , async.apply(testUsername, 'index')
      , async.apply(testUsername, 'signup')
      , async.apply(testUsername, 'summaries')
      , async.apply(testUsername, 'whatisit')
      , async.apply(testUsername, 'logout')
      , async.apply(testUsername, 'login')
      , async.apply(testUsername, 'confirmemail')
      , async.apply(testUsername, 'confirmEmail')
      , async.apply(testUsername, 'forgotpassword')
      , async.apply(testUsername, 'forgotPassword')
      , async.apply(testUsername, 'resetpassword')
      , async.apply(testUsername, 'account')
      , async.apply(testUsername, 'forum')
      , async.apply(testUsername, 'extension')
      , async.apply(testUsername, 'tldrscreated')
      ], done);
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

  });   // ==== End of '#validators' ==== //


  describe('#createAndSaveInstance and #createAndSaveBareProfile', function () {

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

    it('should save a user whose password is valid and set default fields', function (done) {
      var userData = { username: 'NFADeploy'
                     , password: 'notTOOshort'
                     , email: 'valid@email.com'
                     , bio: 'already a bio'
                     };

      User.createAndSaveInstance(userData, function(err, user) {
        assert.isNull(err);
        user.confirmedEmail.should.be.false;
        assert.isUndefined(user.bio);

        User.find({email: 'valid@email.com'}, function(err, docs) {
          docs.should.have.length(1);
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
                     , twitterHandle: 'blapblup'
                     , nonValidField: 'some value'
                     };
      // Try to save data with a non authorized field that will not be saved
      User.createAndSaveInstance(userData, function(err) {
        assert.isNull(err);
        User.findOne({email: 'another@email.com'}, function(err, user) {
          assert.isUndefined(user.nonValidField);

          user.username.should.equal('NFADeploy');
          user.email.should.equal('another@email.com');
          user.twitterHandle.should.equal('blapblup');
          assert.isDefined(user.email);

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

          sessionUsableFields.username.should.equal('NFADeploy');
          sessionUsableFields.email.should.equal('valid@email.com');
          sessionUsableFields.isAdmin.should.equal(false);
          assert.isUndefined(sessionUsableFields.password);

          done();
        });
      });
    });

    it('should set default createdAt, updatedAt, lastActive, notifPrefs and history', function (done) {
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
        user.notificationsSettings.read.should.be.true;

        UserHistory.findOne({ _id: user.history }, function(err, history) {
          history.actions[0].type.should.equal("accountCreation");
          done();
        });
      });
    });

    it('the basic credentials created with the user profile should be attached to it', function (done) {
      var userData = { username: 'NFADeploy'
                     , password: 'notTOOshort'
                     , email: 'valid@email.com'
                     }
        , sessionUsableFields;

      User.createAndSaveInstance(userData, function(err, user) {
        Credentials.findOne({ login: user.email }, function(err, bc) {
          bc.owner.toString().should.equal(user._id.toString());
          user.credentials.length.should.equal(1);
          user.credentials[0].toString().should.equal(bc._id.toString());
          done();
        });
      });
    });

    it('should save a bare profile and set default fields', function (done) {
      var userData = { username: 'NFADeploy'
                     , email: 'valid@email.com'
                     , bio: 'already a bio'
                     };

      User.createAndSaveBareProfile(userData, function(err, user) {
        assert.isNull(err);
        user.confirmedEmail.should.be.false;
        assert.isUndefined(user.bio);
        user.credentials.length.should.equal(0);

        done();
      });
    });


  });   // ==== End of '#createAndSaveInstance and #createAndSaveBareProfile' ==== //


  describe('Get specific credentials', function () {

    it('Returns with no error even if no basic creds were found', function (done) {
      var userData = { username: 'NFADeploy'
                     , email: 'valid@email.com'
                     , bio: 'already a bio'
                     };

      User.createAndSaveBareProfile(userData, function(err, user) {
        assert.isNull(err);
        user.credentials.length.should.equal(0);
        user.getBasicCredentials(function(err, bc) {
          assert.isNull(err);
          assert.isNull(bc);

          done();
        });
      });
    });

    it('Get the correct basic creds if user has both types of creds', function (done) {
      var userData = { username: 'NFADeploy'
                     , email: 'valid@email.com'
                     , password: 'supersecret'
                     , bio: 'already a bio'
                     };

      User.createAndSaveInstance(userData, function(err, user) {
        assert.isNull(err);
        user.credentials.length.should.equal(1);
        Credentials.createGoogleCredentials({ openID: 'http://google.com/tldrio' }, function (err, gc) {
          user.attachCredentialsToProfile(gc, function (err, user) {
            user.credentials.length.should.equal(2);
            user.getBasicCredentials(function (err, bc) {
              assert.isNull(err);
              bc.type.should.equal('basic');
              bc.login.should.equal('valid@email.com');
              done();
            });
          });
        });
      });
    });

  });


  describe('#attachCredentialsToProfile', function () {

    it('Should work as expected, no error possible', function (done) {
      var userData = { username: 'NFADeploy'
                     , password: 'notTOOshort'
                     , email: 'valid@email.com'
                     }
        , otherCredsData = { login: 'bloup@email.com', password: 'anooother' }
        , sessionUsableFields;

      User.createAndSaveInstance(userData, function(err, user) {
        assert.isNull(err);
        user.credentials.length.should.equal(1);

        Credentials.createBasicCredentials(otherCredsData, function (err, bc) {
          assert.isUndefined(bc.owner);

          user.attachCredentialsToProfile(bc, function (err, user) {
            bc.owner.toString().should.equal(user._id.toString());
            user.credentials.length.should.equal(2);
            done();
          });
        });
      });
    });

  });   // ==== End of '#attachCredentialsToProfile' ==== //


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
        user.getCreatedTldrs(function(err, tldrs) {
          _.isArray(tldrs).should.equal(true);
          tldrs.length.should.equal(0);

          Tldr.createAndSaveInstance(tldrData1, user, function(err, tldr1) {
            Tldr.createAndSaveInstance(tldrData2, user,  function(err, tldr2) {
              // user doesn't contain the data in his created tldrs
              assert.isUndefined(user.tldrsCreated[0].url);

              user.getCreatedTldrs(function(err, tldrs) {
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
              assert.isUndefined(err.oldPassword);
              assert.isDefined(err.newPassword);

              done();
            });
          });
        });
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


  describe('Gravatar url management', function () {

    it('#updateGravatarUrl should set the correct Gravatar url, even if the email parameter is empty or missing', function (done) {
      var userData = { username: 'Louis'
                     , password: 'notTOOshort'
                     , email: 'validzzzzz@gmail.com'
                     };

      User.createAndSaveInstance(userData, function(err, user) {
        user.updateGravatarEmail("louis.chatriot@gmail.com", function (err, user) {
          assert.isNull(err);
          user.gravatar.url.should.equal('https://secure.gravatar.com/avatar/e47076995bbe79cfdf507d7bbddbe106?d=wavatar');
          user.gravatar.email.should.equal('louis.chatriot@gmail.com');

          user.updateGravatarEmail('', function (err, user) {
            assert.isNull(err);
            user.gravatar.url.should.equal('https://secure.gravatar.com/avatar/d41d8cd98f00b204e9800998ecf8427e?d=wavatar');
            user.gravatar.email.should.equal('');

            user.updateGravatarEmail(null, function (err, user) {
              assert.isNull(err);
              user.gravatar.url.should.equal('https://secure.gravatar.com/avatar/d41d8cd98f00b204e9800998ecf8427e?d=wavatar');
              user.gravatar.email.should.equal('');

              done();
            });
          });
        });
      });
    });

    it('should set the gravatar url with the user\'s email when creating him', function (done) {
      var userData = { username: 'Louis'
                     , password: 'notTOOshort'
                     , email: 'louis.chatriot@gmail.com'
                     };
      User.createAndSaveInstance(userData, function(err, user) {
        user.gravatar.url.should.equal('https://secure.gravatar.com/avatar/e47076995bbe79cfdf507d7bbddbe106?d=wavatar');
        user.gravatar.email.should.equal('louis.chatriot@gmail.com');

        done();
      });
    });


  });   // ==== End of '#getGravatarUrl' ==== //

  describe('should update the user updatable fields', function() {

    it('should update the fields if they pass validation', function (done) {
      var userData = { username: 'NFADeploy'
                     , password: 'notTOOshort'
                     , email: 'valid@email.com'
                     , bio: 'first bio'
                     }
        , newData = { username: 'NFAMasterDeploy'
                    , password: 'anothergood'
                    , notificationsSettings: { read: false, like: true, edit: false }
                    , email: 'another@valid.com'
                    , bio: 'Another bio !!'
                    , twitterHandle: 'tldrio'
                    };

      User.createAndSaveInstance(userData, function(err, user) {
        assert.isNull(err);
        user.username.should.equal("NFADeploy");
        user.email.should.equal("valid@email.com");
        user.notificationsSettings.read.should.be.true;

        user.updateValidFields(newData, function(err, user2) {
          user2.username.should.equal("NFAMasterDeploy");
          user2.email.should.equal("valid@email.com");
          user2.notificationsSettings.read.should.be.false;
          user2.bio.should.equal("Another bio !!");
          user2.twitterHandle.should.equal('tldrio');

          done();
        });
      });
    });

    it('should remove all @ from a twitter handle if there are some', function (done) {
      var userData = { username: 'NFADeploy'
                     , password: 'notTOOshort'
                     , email: 'valid@email.com'
                     , bio: 'first bio'
                     }
        , newData = { username: 'NFAMasterDeploy'
                    , password: 'anothergood'
                    , email: 'another@valid.com'
                    , bio: 'Another bio !!'
                    , twitterHandle: '@tldrio'
                    };

      User.createAndSaveInstance(userData, function(err, user) {
        user.updateValidFields(newData, function(err, user2) {
          user2.twitterHandle.should.equal('tldrio');
          newData.twitterHandle = "@@bloup";
          user.updateValidFields(newData, function(err, user2) {
            user2.twitterHandle.should.equal('bloup');
            newData.twitterHandle = "@@bl@o@up";
            user.updateValidFields(newData, function(err, user2) {
              user2.twitterHandle.should.equal('bloup');

              done();
            });
          });
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
          , email: 'anothervalid useless since email is updated with another function'
          , bio: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
          , twitterHandle: 'nopenope'
          };

      User.createAndSaveInstance(userData, function(err, user) {
        assert.isNull(err);
        user.username.should.equal("NFADeploy");
        user.email.should.equal("valid@email.com");

        assert.isNull(err);

        user.updateValidFields(newData, function(err, user3) {
          assert.isDefined(err.errors.username);
          assert.isDefined(err.errors.bio);
          _.keys(err.errors).length.should.equal(2);

          newData.twitterHandle = 'dlskgjlsdkfgjlwaaaaaaaytoolong';
          user.updateValidFields(newData, function (err, user4) {
            assert.isDefined(err.errors.twitterHandle);

            done();
          });
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
              done();
            });
          });
        });
      });
    });

  });   // ==== End of 'should update the user updatable fields' ==== //


  describe('Update email', function () {

    it('Should be able to update the email of a bare profile', function (done) {
      var userData = { username: 'NFADeploy'
                     , email: 'valid@email.com'
                     , bio: 'already a bio'
                     };

      User.createAndSaveBareProfile(userData, function(err, user) {
        assert.isNull(err);
        user.credentials.length.should.equal(0);
        user.updateEmail('anothergood@great.com', function(err, user) {
          assert.isNull(err);
          user.email.should.equal('anothergood@great.com');

          done();
        });
      });
    });

    it('Shouldnt update email if there are validation errors', function (done) {
      var userData = { username: 'NFADeploy'
                     , email: 'valid@email.com'
                     , bio: 'already a bio'
                     };

      User.createAndSaveBareProfile(userData, function(err, user) {
        assert.isNull(err);
        user.credentials.length.should.equal(0);
        user.updateEmail('anothergoodgreat.com', function(err, user) {
          var valErr = models.getAllValidationErrorsWithExplanations(err.errors);
          _.keys(valErr).length.should.equal(1);
          assert.isDefined(valErr.email);

          done();
        });
      });
    });

    it('Should be able to update a user who has basic credentials only and recreate the email confirmation token', function (done) {
      var userData = { username: 'NFADeploy'
                     , email: 'valid@email.com'
                     , password: 'supersecret'
                     , bio: 'already a bio'
                     };

      User.createAndSaveInstance(userData, function(err, user) {
        assert.isNull(err);
        user.credentials.length.should.equal(1);

        user.confirmedEmail = true;   // Artificially confirm email
        user.save(function (err, user) {
          user.confirmedEmail.should.equal(true);
          user.updateEmail('anothergood@great.com', function(err, user) {
            assert.isNull(err);
            user.confirmedEmail.should.equal(false);
            assert.isDefined(user.confirmEmailToken);
            user.email.should.equal('anothergood@great.com');

            user.getBasicCredentials(function (err, bc) {
              bc.login.should.equal('anothergood@great.com');
              done();
            });
          });
        });
      });
    });

    it('Cant update profiles email if the target email belongs to a basic credential for a different owner', function (done) {
      var userData = { username: 'NFADeploy'
                     , email: 'valid@email.com'
                     , password: 'supersecret'
                     , bio: 'already a bio'
                     }
        , id;

      User.createAndSaveInstance(userData, function(err, user) {
        assert.isNull(err);
        id = user._id;
        user.credentials.length.should.equal(1);
        user.updateEmail(user1.email, function(err, user) {   // user1 has basic creds
          err.code.should.equal(11001);

          User.findOne({ _id: id }, function (err, user) {
            user.email.should.equal('valid@email.com');
            user.getBasicCredentials(function (err, bc) {
              bc.login.should.equal('valid@email.com');
              done();
            });
          });
        });
      });
    });

    it('Should update email for a user with only a google credentials', function (done) {
      var userData = { username: 'NFADeploy'
                     , email: 'valid@email.com'
                     , bio: 'already a bio'
                     };

      User.createAndSaveBareProfile(userData, function(err, user) {
        assert.isNull(err);

        Credentials.createGoogleCredentials({ openID: 'http://google.com/tldrio' }, function (err, gc) {
          user.attachCredentialsToProfile(gc, function (err, user) {
            user.credentials.length.should.equal(1);
            user.updateEmail('anothergood@great.com', function(err, user) {
              assert.isNull(err);
              user.email.should.equal('anothergood@great.com');

              done();
            });
          });
        });
      });
    });

    it('Should update email for a user with both basic and google creds', function (done) {
      var userData = { username: 'NFADeploy'
                     , email: 'valid@email.com'
                     , password: 'supersecret'
                     , bio: 'already a bio'
                     };

      User.createAndSaveInstance(userData, function(err, user) {
        assert.isNull(err);

        Credentials.createGoogleCredentials({ openID: 'http://google.com/tldrio' }, function (err, gc) {
          user.attachCredentialsToProfile(gc, function (err, user) {
            user.credentials.length.should.equal(2);
            user.updateEmail('anothergood@great.com', function(err, user) {
              assert.isNull(err);
              user.email.should.equal('anothergood@great.com');

              user.getBasicCredentials(function (err, bc) {
                bc.login.should.equal('anothergood@great.com');
                done();
              });
            });
          });
        });
      });
    });

  });   // ==== End of 'Update email' ==== //


  describe('Reset password functions', function() {
    it('Should create a reset password token that expires within one hour', function (done) {
      var userData = { email: 'email@email.com'
                               , password: 'supersecret!'
                               , username: 'Stevie_sTarAc1'
                               , usernameLowerCased: 'stevie_starac1'
                               };

      User.createAndSaveInstance(userData, function(err, user) {
        assert.isNull(err);

        user.createResetPasswordToken(function(err) {
          assert.isNull(err);
          user.getBasicCredentials(function (err, bc) {
            assert.isDefined(bc.resetPasswordToken);
            assert.isDefined(bc.resetPasswordTokenExpiration);

            // The token should expire within an hour, we test that with a tolerance of 5 seconds
            assert.isTrue(bc.resetPasswordTokenExpiration - new Date() >= 3595000);
            assert.isTrue(bc.resetPasswordTokenExpiration - new Date() <= 3600000);

            done();
          });
        });
      });
    });

    it('Should create a different token every time', function (done) {
      var userData = { email: 'email@email.com'
                               , password: 'supersecret!'
                               , username: 'Stevie_sTarAc1'
                               , usernameLowerCased: 'stevie_starac1'
                               , history: '111111111111111111111111'   // Dummy history since it is required
                               }
               , token;

      User.createAndSaveInstance(userData, function (err, user) {
        assert.isNull(err);

        user.createResetPasswordToken(function(err) {
          assert.isNull(err);

          user.getBasicCredentials(function (err, bc) {
            assert.isDefined(bc.resetPasswordToken);
            token = bc.resetPasswordToken;

            user.createResetPasswordToken(function(err) {
              assert.isNull(err);

              user.getBasicCredentials(function (err, bc) {
                assert.isDefined(bc.resetPasswordToken);
                bc.resetPasswordToken.should.not.equal(token);

                done();
              });
            });
          });
        });
      });
    });

    it('Should not reset password if token is invalid', function (done) {
      var userData = { email: 'email@email.com'
                               , password: 'supersecret!'
                               , username: 'Stevie_sTarAc1'
                               , usernameLowerCased: 'stevie_starac1'
                               , history: '111111111111111111111111'   // Dummy history since it is required
                               };

      User.createAndSaveInstance(userData, function (err, user) {
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
      var userData = { email: 'email@email.com'
                               , password: 'supersecret!'
                               , username: 'Stevie_sTarAc1'
                               , usernameLowerCased: 'stevie_starac1'
                               , history: '111111111111111111111111'   // Dummy history since it is required
                               };

      User.createAndSaveInstance(userData, function (err, user) {
        assert.isNull(err);

        user.createResetPasswordToken(function(err) {
          user.getBasicCredentials(function (err, bc) {
            bc.resetPasswordTokenExpiration.setTime(bc.resetPasswordTokenExpiration.getTime() - 3605000);
            bc.save(function(err) {
              assert.isNull(err);

              user.resetPassword(user.resetPasswordToken, 'perfectlygoodpassword', function(err) {
                err.tokenInvalidOrExpired.should.equal(true);
                done();
              });
            });
          });
        });
      });
    });

    it('Should not reset password if new password is invalid', function (done) {
      var userData = { email: 'email@email.com'
                               , password: 'supersecret!'
                               , username: 'Stevie_sTarAc1'
                               , usernameLowerCased: 'stevie_starac1'
                               , history: '111111111111111111111111'   // Dummy history since it is required
                               };

      User.createAndSaveInstance(userData, function (err, user) {
        assert.isNull(err);

        user.createResetPasswordToken(function(err) {
          assert.isNull(err);

          user.getBasicCredentials(function (err, bc) {
            user.resetPassword(bc.resetPasswordToken, 'bad', function(err) {
              assert.isDefined(models.getAllValidationErrorsWithExplanations(err.errors).password);
              done();
            });
          });
        });
      });
    });

    it('Should reset password if token and new password are valid', function (done) {
      var userData = { email: 'email@email.com'
                               , password: 'supersecret!'
                               , username: 'Stevie_sTarAc1'
                               , usernameLowerCased: 'stevie_starac1'
                               , history: '111111111111111111111111'   // Dummy history since it is required
                               };

      User.createAndSaveInstance(userData, function (err, user) {
        assert.isNull(err);

        user.createResetPasswordToken(function(err) {
          assert.isNull(err);

          user.getBasicCredentials(function (err, bc) {
            user.resetPassword(bc.resetPasswordToken, 'goodpassword', function(err) {
              assert.isNull(err);

              user.getBasicCredentials(function (err, bc) {
                // Token is reinitialized
                assert.isNull(bc.resetPasswordToken);
                assert.isNull(bc.resetPasswordTokenExpiration);
                bcrypt.compareSync('supersecret!', bc.password).should.equal(false);
                bcrypt.compareSync('goodpassword', bc.password).should.equal(true);
                done();
              });
            });
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
                               , bio: 'something'   // No possible XSS problem on creation
                               , twitterHandle: 'anodocument.writether'
                               , gravatarEmail: 'bloup@emdocument.writeail.com'   // Useless it is set up as user's email by when user is created
                               };

      User.createAndSaveInstance(userInput, function(err, theUser) {
        theUser.email.should.equal('email@email.com');
        theUser.username.should.equal('Stevie_sTarAc1');
        theUser.usernameLowerCased.should.equal('stevie_starac1');
        theUser.twitterHandle.should.equal('another');
        assert.isUndefined(theUser.bio);
        theUser.gravatar.email.should.equal('email@email.com');

        done();
      });
    });

    it('Should sanitize all user-inputed fields and the fields derived from user input when updating', function (done) {
      var goodUserInput = { email: 'blip@email.com'
                               , password: 'supersecret!'
                               , username: 'quelquun'
                               }
        , userInput = { email: 'ema-moz-bindingil@email.com'
                               , username: 'Stevie_sTar-moz-bindingAc1'
                               , usernameLowerCased: 'veryBAD document.write'   // XSS try should fail even though this field is not directly sanitized because
                                                                                // it is derived from username
                               , bio: 'something not cool like a document.write is here'
                               , twitterHandle: 'rohdocument.writebad'
                               };

      User.createAndSaveInstance(goodUserInput, function(err, user) {
        user.updateValidFields(userInput, function (err, theUser) {
          theUser.email.should.equal('blip@email.com');
          theUser.username.should.equal('Stevie_sTarAc1');
          theUser.usernameLowerCased.should.equal('stevie_starac1');
          theUser.bio.should.equal('something not cool like a  is here');
          theUser.twitterHandle.should.equal('rohbad');

          done();
        });
      });
    });

    it('Should sanitize gravatarEmail', function (done) {
      var goodUserInput = { email: 'blip@email.com'
                               , password: 'supersecret!'
                               , username: 'quelquun'
                               };

      User.createAndSaveInstance(goodUserInput, function(err, user) {
        user.updateGravatarEmail('badocument.write@email.com', function (err, theUser) {
          theUser.gravatar.email.should.equal('ba@email.com');

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
          users.lc.isAdmin.should.equal(true);
          users.sm.isAdmin.should.equal(true);
          users.cm.isAdmin.should.equal(true);
          users.rb.isAdmin.should.equal(false);

          // Fake accounts based on Louis' should be admins too
          users.lc1.isAdmin.should.equal(true);
          users.lc2.isAdmin.should.equal(true);
          users.lc3.isAdmin.should.equal(true);
          users.lc4.isAdmin.should.equal(true);
          users.lc5.isAdmin.should.equal(true);

          // Fake accounts based on Charles' should be admins too
          users.cm1.isAdmin.should.equal(true);
          users.cm2.isAdmin.should.equal(true);
          users.cm3.isAdmin.should.equal(true);
          users.cm4.isAdmin.should.equal(true);
          users.cm5.isAdmin.should.equal(true);
          users.cm6.isAdmin.should.equal(true);

          // Fake accounts based on Stan' should be admins too
          users.sm1.isAdmin.should.equal(true);
          users.sm2.isAdmin.should.equal(true);
          users.sm3.isAdmin.should.equal(true);
          users.sm4.isAdmin.should.equal(true);
          users.sm5.isAdmin.should.equal(true);

          user1.isAdmin.should.equal(false);

          cb();
        }
      ], done);
    });

  });   // ==== End of 'Admin role' ==== //


  describe('#findAvailableUsername', function () {

    it('Should find an available username as is', function (done) {
      User.findAvailableUsername('availABLe', function (err, username) {
        username.should.equal('availABLe');
        done();
      });
    });

    it('Should remove all non alphanumerical characters', function (done) {
      User.findAvailableUsername(' .gr/`ea_@@t', function (err, username) {
        username.should.equal('great');
        done();
      });
    });

    it('Should find a suitable username when tentative username is taken (comparisons done lower case)', function (done) {
      User.findAvailableUsername('useRTEst1', function (err, username) {
        username.should.equal('useRTEst11');
        done();
      });
    });

    it('Find a good placeholder if no tentative username given, or too short', function (done) {
      User.findAvailableUsername(undefined, function (err, username) {
        username.should.equal('NewUser');
        User.findAvailableUsername('o', function (err, username) {
          username.should.equal('NewUser');
          done();
        });
      });
    });

    it('Should cut the username if too long', function (done) {
        User.findAvailableUsername('bloupbloupbloupbloup', function (err, username) {
          username.should.equal('bloupbloupblo');
          done();
        });
    });

  });   // ==== End of '#findAvailableUsername' ==== //


  describe('Account deletion', function () {

    it('Should be able to delete a user with his basic cred if he has only a basic cred', function (done) {
      var nUsers, nCredentials;

      user2.deleted.should.equal(false);
      User.find({}, function (err, users) {
        nUsers = users.length;
        Credentials.find({}, function (err, creds) {
          nCredentials = creds.length;
          Credentials.find({ owner: user2._id }, function (err, creds) {
            creds.length.should.equal(1);

            user2.deleteAccount(function (err) {
              assert.isNull(err);
              User.find({}, function (err, users) {
                users.length.should.equal(nUsers);
                Credentials.find({}, function (err, creds) {
                  creds.length.should.equal(nCredentials - 1);

                  // user2 is now in the "deleted" state
                  User.findOne({ _id: user2._id }, function (err, user2) {
                    assert.isUndefined(user2.username);
                    assert.isUndefined(user2.usernameLowerCased);
                    assert.isUndefined(user2.email);
                    user2.credentials.length.should.equal(0);
                    user2.deleted.should.equal(true);
                    user2.gravatar.url.should.equal('');
                    user2.gravatar.email.should.equal('');
                    ['read', 'edit', 'congratsTldrViews', 'postForum', 'newsletter', 'serviceUpdates', 'thank'].forEach(function (notif) {
                      user2.notificationsSettings[notif].should.equal(false);
                    });

                    Credentials.find({ owner: user2._id }, function (err, creds) {
                      creds.length.should.equal(0);

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

    it('Should be able to delete a user with all his credentials if he has multiple ones', function (done) {
      var nUsers, nCredentials;

      user2.deleted.should.equal(false);
      User.find({}, function (err, users) {
        nUsers = users.length;
        Credentials.find({}, function (err, creds) {
          nCredentials = creds.length;

          Credentials.createGoogleCredentials({ openID: 'something', googleEmail: user2.email }, function (err, gc) {
            user2.attachCredentialsToProfile(gc, function () {
              Credentials.find({}, function (err, creds) {
                creds.length.should.equal(nCredentials + 1);
                nCredentials = creds.length;

                Credentials.find({ owner: user2._id }, function (err, creds) {
                  creds.length.should.equal(2);

                  User.findOne({ _id: user2._id }, function (err, user2) {
                    user2.credentials.length.should.equal(2);

                    user2.deleteAccount(function (err) {
                      assert.isNull(err);
                      User.find({}, function (err, users) {
                        users.length.should.equal(nUsers);
                        Credentials.find({}, function (err, creds) {
                          creds.length.should.equal(nCredentials - 2);

                          // user2 is now in the "deleted" state
                          User.findOne({ _id: user2._id }, function (err, user2) {
                            assert.isUndefined(user2.username);
                            assert.isUndefined(user2.usernameLowerCased);
                            assert.isUndefined(user2.email);
                            user2.credentials.length.should.equal(0);
                            user2.deleted.should.equal(true);

                            Credentials.find({ owner: user2._id }, function (err, creds) {
                              creds.length.should.equal(0);

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
          });
        });
      });
    });

    it('Should be possible to create a user with the same username and email as a formerly deleted user', function (done) {
      var userData = { email: user2.email, username: user2.username, password: 'supersecret' }
        ;

      User.createAndSaveInstance(userData, function (err) {
        err.code.should.equal(11000);

        user2.deleteAccount(function () {
          User.createAndSaveInstance(userData, function (err) {
            assert.isNull(err);

            done();
          });
        });
      });
    });

    it('Should be possible to delete more than user because the index is sparse', function (done) {
      user1.deleteAccount(function (err) {
        assert.isNull(err);
        user2.deleteAccount(function (err) {
          assert.isNull(err);

          done();
        });
      });
    });

    it('The virtual usernameForDisplay should reflect the deleted state', function (done) {
      user2.usernameForDisplay.should.equal(user2.username);
      user2.deleteAccount(function () {
        User.findOne({ _id: user2._id }, function (err, user2) {
          user2.usernameForDisplay.should.equal(i18n.deletedAccount);
          done();
        });
      });
    });

    it('Upon deletion, the users private data should be stored in the DeletedUsersData collection for safe keeping', function (done) {
      var theEmail = user2.email, theUsername = user2.username
        , theGravatarUrl = user2.gravatar.url, theGravatarEmail = user2.gravatar.email
        , theId = user2._id
        ;

      DeletedUsersData.find(function (err, duds) {
        duds.length.should.equal(0);

        user2.deleteAccount(function (err) {
          assert.isNull(err);
          DeletedUsersData.find(function (err, duds) {
            duds.length.should.equal(1);
            duds[0].email.should.equal(theEmail);
            duds[0].username.should.equal(theUsername);
            duds[0].gravatar.url.should.equal(theGravatarUrl);
            duds[0].gravatar.email.should.equal(theGravatarEmail);
            duds[0].deletedUser.toString().should.equal(theId.toString());

            done();
          });
        });
      });
    });





  });   // ==== End of 'Account deletion' ==== //


});
