default: setup

MOCHA=node_modules/.bin/mocha

all: setup test

.PHONY: release test loc clean

tag:
	git tag -a "v$(VERSION)" -m "Version $(VERSION)"

tag-push: tag
	git push --tags origin HEAD:master

test:
	$(MOCHA) -R spec test/*.js

loc:
	wc -l lib/*

clean:
	rm -rf node_modules

setup:
	npm install . -d
