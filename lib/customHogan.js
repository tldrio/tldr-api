var hogan = require('hogan.js')
  , fs = require('fs')
  , cache = {}
  , _ = require('underscore')
  , async = require('async')
  , config = require('./config')
  , compiledTemplates = {}
  , templatesDir = config.templatesDir;   // All templates are in this directory, we put the name here so as not to write it everywhere


/*
 * Compile all mustache templates in templatesDir/root and put the result in compiledTemplates
 * Used only once at the first rendering, then all compiled templates will be cached for more efficiency
 */
function readAndCompileTemplates (root, callback) {
  var files = [], dirs = [];

  fs.readdir(templatesDir + root, function (err, dirContents) {
    if (err) { return callback(); }   // If we can't read the directory, it may mean it is in fact a file not ending with
                                      // .mustache and thus mistaken for a directory in a lower recursion level. It may also mean
                                      // the given root is not a directory, so we can't read it. In both cases we just continue
                                      // continue with normal execution, user will be alerted if he wants to render a non-compiled template anyway

    // Once directory has been read, sort items between templates (= ending in '.mustache') and subdirectories
    _.each(dirContents, function (item) {
      if (item.match(/\.mustache$/)) {
        files.push(root + item);
      } else {
        dirs.push(root + item);
      }
    });

    // Compile all templates in this level of the file system, then call readAndCompileTemplates on the deeper directories
    var i = 0;
    async.whilst(
      function () { return i < files.length; }
    , function (cb) {
        fs.readFile(templatesDir + files[i], 'utf8', function (err, str) {
          i += 1;   // Increment i here so that there is a read error, we can simply move on to the next file and ignore the problematic one

          if (err) { return cb(); }

          compiledTemplates[files[i - 1]] = hogan.compile(str);
          cb();
        });
      }
    , function () {
        // Now compile all templates in sub levels of the file system found in the 'fs.readDir' above
        var i = 0;
        async.whilst(
          function () { return i < dirs.length; }
        , function (cb) {
            readAndCompileTemplates(dirs[i] + '/', function () {
              i += 1;
              cb();
            });
          }
        , callback
        );
      }
    );
  });
}


// This function assumes all necessary templates have been compiled before being called
// That's why they are compiled in the server module, before even connecting to the db and launching the server
function render (path, options, fn) {
  var indd = hogan.compile('EEEEEEEEEEEEEEEEEEE');
  console.log("=====================");
  console.log(path);
  console.log(_.keys(compiledTemplates));
  console.log(compiledTemplates[path]);

  try {
    fn(null, compiledTemplates[path].render(options, { bloup: '{{>index}}', index: indd }));
  } catch (err) {
    fn(err);
  }

};


// Exports
module.exports.readAndCompileTemplates = readAndCompileTemplates;
module.exports.render = render;
