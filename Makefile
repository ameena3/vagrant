.PHONY: help up down build restart logs backend frontend mongo clean dev-backend dev-frontend setup

# Default target
help: ## Show this help message
	@echo "Fresh Kitchen - Makefile Commands"
	@echo "=================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Docker Compose Commands
up: ## Start all services (docker-compose up -d)
	docker-compose up -d

up-build: ## Build and start all services
	docker-compose up -d --build

down: ## Stop all services
	docker-compose down

build: ## Build all Docker images
	docker-compose build

restart: ## Restart all services
	docker-compose restart

logs: ## Show logs from all services (follow mode)
	docker-compose logs -f

logs-backend: ## Show backend logs
	docker-compose logs -f backend

logs-frontend: ## Show frontend logs
	docker-compose logs -f frontend

logs-mongo: ## Show MongoDB logs
	docker-compose logs -f mongodb

# Individual Service Commands
backend: ## Start only the backend service
	docker-compose up -d backend mongodb

frontend: ## Start only the frontend service
	docker-compose up -d frontend

mongo: ## Start only MongoDB
	docker-compose up -d mongodb

# Development Commands (without Docker)
dev-backend: ## Run backend locally (requires Go and MongoDB)
	cd backend && go run ./cmd/server

dev-frontend: ## Run frontend locally (requires Node.js)
	cd frontend && npm run dev

dev-install: ## Install all dependencies for local development
	cd frontend && npm install
	cd backend && go mod tidy

# Setup Commands
setup: ## Initial setup - copy .env.example to .env
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env file from .env.example"; \
		echo "Please edit .env with your Google OAuth and Stripe credentials"; \
	else \
		echo ".env file already exists"; \
	fi

# Cleanup Commands
clean: ## Remove all containers, volumes, and build artifacts
	docker-compose down -v --rmi local
	rm -rf frontend/.next frontend/node_modules

reset-db: ## Reset MongoDB data (WARNING: deletes all data)
	docker-compose down
	docker volume rm $$(docker volume ls -q | grep mongo_data) 2>/dev/null || true
	docker-compose up -d mongodb
	@echo "MongoDB reset. Waiting for init..."
	@sleep 3
	@echo "Done. Run 'make up' to start all services."

# Status Commands
status: ## Show status of all services
	docker-compose ps

health: ## Check backend health endpoint
	@curl -s http://localhost:8080/health | python3 -m json.tool 2>/dev/null || echo "Backend not reachable"
