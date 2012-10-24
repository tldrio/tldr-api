// This is the main application configuration file
module.exports = function(grunt) {
  // grunt configuration
  grunt.initConfig({

    // JSHint configuration
    // see here for explanation: http://www.jshint.com/options/
    jshint: {
      options: { curly: true
               , devel: true
               , debug: true
               , eqeqeq: true
               , expr: true
               , es5: true // to be able to use reserved words like throw, false etc.
               , forin: true
               , immed: true
               , latedef: true
               , laxcomma: true
               , newcap: true
               , noarg: true
               , onevar: true
               , scripturl: true
               , trailing: true
               , undef: true
               }
    , globals: { __dirname: true
               , after: true
               , afterEach: true
               , before: true
               , beforeEach: true
               , Buffer: true
               , describe: true
               , it: true
               , mocha: true
               , module: true
               , process: true
               , require: true
               }
    }

    // The lint task will run JSHint and report any errors
    // You can change the options for this task, by reading this:
    // https://github.com/cowboy/grunt/blob/master/docs/task_lint.md
  , lint: {
      files: [ '*.js', 'test/*.js', 'lib/*.js', 'models/*.js', 'routes/*.js']
    }

    // watch task to help during development
  , watch: { files: ['<config:lint.files>']
           , tasks: ['lint']
           }
  });

  // register aliases
  // default task
  grunt.registerTask('default', 'watch');

  grunt.loadTasks('grunt-tasks/tasks');
};
