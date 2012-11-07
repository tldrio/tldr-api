/*
 * Wrapper around Marked that set the options once and for all
 */
var marked = require('marked');

// We want to use Github flavored markdown which enables link auto detection
// and sanitize all user input since we use the triple mustache
marked.setOptions({ pedantic: false
                  , gfm: true
                  , sanitize: true
                  });

module.exports = marked;
