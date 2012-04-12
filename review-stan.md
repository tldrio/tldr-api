## Naming changes

* currentEnvironment - env
* environment - env
* \_u -> \_ (don't use weird names for things, use their usual names
	unless you have a VERY good reason not too)
* what is the _models.js_ file? it doesn't define models, it should be
	renamed to something like modelHelpers.js
* resourceAuthor - author why complicate things?
* dateCreated - createdAt (like in rails)
* lastUpdated - updatedAt (like in rails)
* getIdFromUrl - computeIdFromUrl, with _get_ there is the idea that you
	are simply retrieving a value instead of computing it
* customUtils - customUtil, to match node name `util`
* tldrAlreadyExistsError - TldrAlreadyExistsError, shouldn't it start
	with a capital letter?

## Better comments needed

* functions in models.js (use JSDoc format)
* in models/tldrModels.js
    * statics and dynamics: of what?, why do i only find statics in the code if dynamics are announced in the comments?
    * wtf does "craft all the necessary" mean?
* chainSave (use JSDoc format)
* MissingArgumentError, comment is super vague: what kind of object?

## API changes needed
	
* separate create and update, this is a very bad way to do it, not
	RESTful and makes a db call to check if id tldr exist all the time ->
	BAD

## Other changes

* i'm not sure ` var cb = callback || function (arg) { return arg;} ;`
	is the right way to handle null callbacks, but i could be wrong. Seems
	strange that you need to call a function even if it's empty, i'd
	rather not call it if it's null.

## Other questions

* how did you decide on the 1500 characters limit?
* why do you need to validate protocol in url?
* wtf is `chainSave()`?
