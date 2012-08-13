/*
 * grunt
 * https://github.com/cowboy/grunt
 *
 * Copyright (c) 2012 "Cowboy" Ben Alman
 * Copyright (c) 2012 John K. Paul @johnkpaul
 * Licensed under the MIT license.
 * http://benalman.com/about/license/
 */

module.exports = function(grunt) {

  // Register new task to run integration tests with CasperJs
  grunt.registerTask( 'mocha', 'Run mocha tests', function() {
    // Tell grunt this task is asynchronous.
    var done = this.async()
    , exec = require('child_process').exec;
    var command = 'NODE_ENV="test" ./node_modules/.bin/mocha --colors --reporter spec';
    exec( command, function (err, stdout, stderr) {
      grunt.log.write( stdout );
      if (err) {
        grunt.warn(err);
        done(false);
      } else {
        done();
      }
    });
  });
};
