var hogan = require('hogan.js')
  , fs = require('fs')
  , cache = {}
  , compiledTemplates;


function read(path, options, fn) {
  var str = cache[path];

  // cached
  if (options.cache && str) return fn(null, str);

  // read
  fs.readFile(path, 'utf8', function(err, str){
    if (err) return fn(err);
    if (options.cache) cache[path] = str;
    fn(null, str);
  });
}



module.exports = function(path, options, fn) {

  read(path, options, function(err, str) {
    if (err) return fn(err);
    try {
      var tmpl = hogan.compile(str, options);
      fn(null, tmpl.render(options));
    } catch (err) {
      fn(err);
    }
  });
};

