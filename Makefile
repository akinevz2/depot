# Master Makefile — forwards commands to subdirectories.
# Discovers subdirectories with a docker-compose file or a git repository at
# runtime, so new projects are picked up without editing this file.
#
# The DEPOT parts (docs/DEPOT.md in ~/dots: the submodules the dots
# system deploys) are owned by the depot-* targets, NOT by the generic
# discovery — they are excluded below so the generic update never pulls
# them (a detached-HEAD checkout fails `git pull`, and the depot sync
# has its own reattach-to-branch procedure). depot-freshness is the
# documentation-retrieval surface: the versions the website's project
# registry claims, per checkout.

SHELL := /bin/bash

# The depot parts: the submodules ~/dots deploys (docs/DEPOT.md).
DEPOT_PARTS := herbctl herbstutil polyframes polytags on-deploy

# Excluded from all operations (source mirrors / book-keeping only,
# plus the depot parts — depot-* owns those).
EXCLUDE := polyframes $(DEPOT_PARTS)

# --- Runtime discovery ------------------------------------------------------

# Subdirectories containing a docker-compose / compose file
COMPOSE_DIRS := $(sort $(patsubst %/,%,$(dir $(wildcard */docker-compose.yml \
	*/docker-compose.yaml \
	*/compose.yml \
	*/compose.yaml))))
COMPOSE_DIRS := $(filter-out $(EXCLUDE),$(COMPOSE_DIRS))

# Subdirectories containing a git repository
GIT_DIRS := $(sort $(patsubst %/,%,$(dir $(wildcard */.git))))
GIT_DIRS := $(filter-out $(EXCLUDE),$(GIT_DIRS))

# --- Targets ----------------------------------------------------------------

.DEFAULT_GOAL := help
.PHONY: down status update help depot-update depot-freshness depot-registry

depot-update:  ## Sync every depot part like ~/dots' submodule walk: skip uncommitted checkouts, fetch, reattach to the tracked branch, fast-forward
	@failed=0; \
	for d in $(DEPOT_PARTS); do \
		[ -d "$$d/.git" ] || { echo "==> $$d: not a git checkout — skipped"; continue; }; \
		if [ -n "$$(git -C $$d status --porcelain)" ]; then \
			echo "==> $$d: UNCOMMITTED changes — skipped (the local checkout is the testable state)"; \
			continue; \
		fi; \
		echo "==> $$d: fetch + fast-forward the tracked branch"; \
		( cd $$d && git fetch origin && \
			branch=$$(git rev-parse --abbrev-ref HEAD) && \
			if [ "$$branch" = "HEAD" ]; then \
				branch=$$(git ls-remote --symref origin/HEAD 2>/dev/null | awk '/^ref:/{sub("refs/heads/",""); print $$2}'); \
				branch=$${branch:-main}; \
				git checkout "$$branch"; \
			fi && \
			git merge --ff-only "origin/$$branch" ) \
			|| { echo "FAILED: $$d (diverged? resolve by hand — the guard is ff-only on purpose)"; failed=1; }; \
	done; \
	exit $$failed

depot-freshness:  ## The documentation-retrieval surface: branch, drift vs origin, declared version, last commit date per depot part
	@for d in $(DEPOT_PARTS); do \
		[ -d "$$d/.git" ] || continue; \
		branch=$$(git -C $$d rev-parse --abbrev-ref HEAD); \
		version=$$(grep -o '"version": *"[^"]*"' $$d/package.json 2>/dev/null | head -1 | grep -o '[0-9][^"]*'); \
		drift=$$(git -C $$d fetch origin --quiet 2>/dev/null; git -C $$d rev-list --left-right --count "$$branch...origin/$$branch" 2>/dev/null | awk '{printf "ahead %s / behind %s", $$1, $$2}'); \
		printf "%-14s %-8s v%-9s %s\n" "$$d" "$$branch" "$${version:-?}" "$$drift"; \
	done

depot-registry:  ## Refresh the website's project registry (scripts/refresh-projects.mjs — the tokens the projects pages expand)
	cd $(CURDIR)/../personal/website && node scripts/refresh-projects.mjs

down:  ## Stop and remove all discovered compose services
	@failed=0; \
	for d in $(COMPOSE_DIRS); do \
		echo "==> $$d: docker compose down"; \
		(cd "$$d" && docker compose down) || { echo "FAILED: $$d"; failed=1; }; \
	done; \
	exit $$failed

status:  ## Show compose status for each discovered service
	@failed=0; \
	for d in $(COMPOSE_DIRS); do \
		echo "==> $$d"; \
		(cd "$$d" && docker compose ps) || { echo "FAILED: $$d"; failed=1; }; \
		echo; \
	done; \
	exit $$failed

update:  ## git pull --ff-only in every discovered git repository
	@failed=0; \
	for d in $(GIT_DIRS); do \
		echo "==> $$d: git pull"; \
		(cd "$$d" && git pull --ff-only) || { echo "FAILED: $$d"; failed=1; }; \
	done; \
	exit $$failed

help:  ## Show discovered services and available targets
	@echo "Discovered compose services: $(COMPOSE_DIRS)"
	@echo "Discovered git repos:        $(GIT_DIRS)"
	@echo "Depot parts (depot-*):       $(DEPOT_PARTS)"
	@echo
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?##' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS=":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'
