test:
	@echo "TLDR - Launching tests. Setting environment to test"
	@ TLDR_ENV="test" ./node_modules/.bin/mocha --reporter list
	@echo "Tests finished, setting evironment back to development"

.PHONY: test

