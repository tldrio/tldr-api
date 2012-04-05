test:
	@echo "TLDR - Launching tests. Setting environment to test"
	@ TLDR_ENV="test" ./node_modules/.bin/mocha --reporter spec 
	@echo "Tests finished, setting evironment back to development"

debug:
	@echo "TLDR - Launching tests. Setting environment to test. Bunyan Logs are prettified"
	@ TLDR_ENV="test" ./node_modules/.bin/mocha --reporter landing | ./node_modules/.bin/bunyan -o simple
	@echo "Tests finished, setting evironment back to development"

testPretty:
	@echo "TLDR - Launching tests. Setting environment to test"
	@ TLDR_ENV="test" ./node_modules/.bin/mocha --reporter spec | ./node_modules/.bin/bunyan -o simple
	@echo "Tests finished, setting evironment back to development"


.PHONY: test

