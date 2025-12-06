.PHONY: test deploy

TEST_PORT = 51480

APP_NAME = x-spam-highlighter
JS_NAME = $(APP_NAME).user.js
REPO_URL = "https://github.com/shapoco/$(APP_NAME)"
DIST_URL = "$(REPO_URL)/raw/refs/heads/main/dist"

BIN_DIR = $(shell pwd)/bin
SRC_DIR = src
DIST_DIR = dist

deploy:
	$(BIN_DIR)/increment_revision.py -f "$(SRC_DIR)/$(JS_NAME)"

	@mkdir -p dist
	cp -f "$(SRC_DIR)/$(JS_NAME)" "$(DIST_DIR)/."
	sed -i "$(DIST_DIR)/$(JS_NAME)" -e "s#http://localhost:[0-9]\+/\?\$$#$(REPO_URL)#g"
	sed -i "$(DIST_DIR)/$(JS_NAME)" -e "s#http://localhost:[0-9]\+/#$(DIST_URL)/#g"
	sed -i "$(DIST_DIR)/$(JS_NAME)" -e "s# (Debug)##g"
	sed -i "$(DIST_DIR)/$(JS_NAME)" -e "s#const DEBUG_MODE = true;#const DEBUG_MODE = false;#g"

test:
	python3 -m http.server -d "$(SRC_DIR)" "$(TEST_PORT)"
