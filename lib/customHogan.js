var hogan = require('hogan.js')
  , fs = require('fs')
  , cache = {}
  , _ = require('underscore')
  , async = require('async')
  , config = require('./config')
  , compiledTemplates = {}
  , templatesDir = config.templatesDir;   // All templates are in this directory, we put the name here so as not to write it everywhere


/**
 * Compile all mustache templates in templatesDir/root and put the result in compiledTemplates
 * Used only once at the first rendering, then all compiled templates will be cached for more efficiency
 * @param {String} root directory from which to recursively compile all Mustache templates
 * @param {Function} callback to be called after execution. Will be called even if there is an error, since that only means some files were not processed
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

          compiledTemplates[stripMustacheExtension(files[i - 1])] = hogan.compile(str);
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


// Remove the '.mustache' extension from a given filename, if there is one.
function stripMustacheExtension (str) {
  if (str.indexOf('.mustache') === str.length - 9) {
    return str.substr(0, str.length - 9);
  } else {
    return str;
  }
}


// Remove the part of a filename that begins with the root directory for templates, if that's the case
// Used to respect Express' API while still augmenting its rather silly behaviour
function stripTemplatesDir (str) {
  if (str.indexOf(config.templatesDir) === 0) {
    return str.substr(config.templatesDir.length);
  } else {
    return str;
  }
}


// This function assumes all necessary templates have been compiled before being called
// That's why they are compiled in the server module, before even connecting to the db and launching the server
function render (path, options, fn) {
  var templateToRender = compiledTemplates[stripTemplatesDir(stripMustacheExtension(path))];

  try {
    // If compiledTemplates and options.partials have keys in common, compiledTemplates' will be rewritten
    // which is the intended behaviour because we can override it when we want
    fn(null, templateToRender.render(options.values, _.extend(compiledTemplates, options.partials)));
  } catch (err) {
    fn(err);
  }

};


// Exports
module.exports.readAndCompileTemplates = readAndCompileTemplates;
module.exports.render = render;
