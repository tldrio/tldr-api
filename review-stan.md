## Naming changes

* currentEnvironment - env
* environment - env
* _u -> _ (don't use weird names for things, use their usual names
	unless you have a VERY good reason not too)

## Better comments needed

* functions in models.js (use JSDoc format)

## API changes needed

* separate create and update, this is a very bad way to do it, not
	RESTful and makes a db call to check if id tldr exist all the time ->
	BAD
