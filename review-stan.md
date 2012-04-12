## Naming changes

* currentEnvironment - env
* environment - env
* \_u -> \_ (don't use weird names for things, use their usual names
	unless you have a VERY good reason not too)
* what is the _models.js_ file? it doesn't define models, it should be
	renamed to something like modelHelpers.js

## Better comments needed

* functions in models.js (use JSDoc format)

## API changes needed

* separate create and update, this is a very bad way to do it, not
	RESTful and makes a db call to check if id tldr exist all the time ->
	BAD

## Architecture changes needed

* i'm not sure that models should be defined at the same place as the
	model helpers, it looks kinda weird to me.
