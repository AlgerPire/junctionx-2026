.PHONY: dev seed test lint db-up db-down api web install

ROOT := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
API := $(ROOT)apps/api
WEB := $(ROOT)apps/web

db-up:
	docker compose up -d db

db-down:
	docker compose down

install:
	cd $(API) && python -m pip install -e ".[dev]"
	cd $(WEB) && pnpm install

api:
	cd $(API) && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

web:
	cd $(WEB) && pnpm dev

dev: db-up
	@echo "Start API with: make api"
	@echo "Start web with: make web"

seed:
	cd $(API) && python -m app.seed

test:
	cd $(API) && pytest -q

lint:
	cd $(API) && ruff check .
	cd $(WEB) && pnpm lint
