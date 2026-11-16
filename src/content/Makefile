.DEFAULT_GOAL := post

CONTENT_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
PROJECT_ROOT := $(abspath $(CONTENT_DIR)/../..)
NEW_POST_SCRIPT := $(CONTENT_DIR)new-post.mjs
ARGS ?=
COMMIT_MESSAGE ?= chore: update blog
GIT_COMMIT_COMMAND = cd "$(PROJECT_ROOT)" && git add -A && if git diff --cached --quiet; then echo "No changes to commit."; else git commit -m "$(COMMIT_MESSAGE)"; fi

.PHONY: post new deploy deploy-g git help

post new:
	node "$(NEW_POST_SCRIPT)" "$(PROJECT_ROOT)"

git:
	@$(GIT_COMMIT_COMMAND)

deploy: $(if $(filter -g,$(ARGS)),git)
	cd "$(PROJECT_ROOT)" && pnpm run deploy

deploy-g: git
	cd "$(PROJECT_ROOT)" && pnpm run deploy

help:
	@printf '%s\n' \
		'Usage:' \
		'  cd src/content && make        Interactively create a new blog post' \
		'  cd src/content && make post   Interactively create a new blog post' \
		'  cd src/content && make new    Alias for "make post"' \
		'  cd src/content && make git    Stage and commit all repository changes' \
		'  cd src/content && make deploy Run "pnpm run deploy"' \
		'  cd src/content && make deploy ARGS=-g Commit, then deploy' \
		'  cd src/content && make deploy-g      Same as "deploy ARGS=-g"' \
		'  cd src/content && make help   Show this help' \
		'' \
		'The post wizard asks for a title, category, tags, and a required' \
		'destination selected from src/content/blog. Use Up/Down or j/k to move,' \
		'Enter to confirm. Category and directory menus offer creation options.' \
		'GNU make cannot parse "make deploy -g"; use ARGS=-g or deploy-g.'
