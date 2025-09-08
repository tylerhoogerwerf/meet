# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOCLEAN=$(GOCMD) clean
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod

# Detect OS for binary naming
ifeq ($(OS),Windows_NT)
    BINARY_NAME=meet-backend.exe
    BINARY_UNIX=$(BINARY_NAME)_unix
    RM=del /Q
    EXEC=$(BINARY_NAME)
else
    BINARY_NAME=meet-backend
    BINARY_UNIX=$(BINARY_NAME)_unix
    RM=rm -f
    EXEC=./$(BINARY_NAME)
endif

# Build targets
.PHONY: all build clean test deps run docker-build docker-run

all: test build

build:
	$(GOBUILD) -o $(BINARY_NAME) -v ./cmd/server

build-linux:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 $(GOBUILD) -o $(BINARY_UNIX) -v ./cmd/server

clean:
	$(GOCLEAN)
ifeq ($(OS),Windows_NT)
	if exist $(BINARY_NAME) del $(BINARY_NAME)
	if exist $(BINARY_UNIX) del $(BINARY_UNIX)
else
	rm -f $(BINARY_NAME)
	rm -f $(BINARY_UNIX)
endif

test:
	$(GOTEST) -v ./...

deps:
	$(GOMOD) download
	$(GOMOD) tidy

run:
	$(GOBUILD) -o $(BINARY_NAME) -v ./cmd/server
	$(EXEC)

dev:
	$(GOCMD) run ./cmd/server

docker-build:
	docker build -t $(BINARY_NAME) .

docker-run:
	docker run -p 8080:8080 --env-file .env $(BINARY_NAME)

docker-compose-up:
	docker-compose up -d

docker-compose-down:
	docker-compose down

# Development helpers
fmt:
	$(GOCMD) fmt ./...

vet:
	$(GOCMD) vet ./...

lint:
	golangci-lint run

# Install development tools
install-tools:
	$(GOGET) -u github.com/golangci/golangci-lint/cmd/golangci-lint

# Help
help:
	@echo "Available targets:"
	@echo "  build         - Build the binary"
	@echo "  build-linux   - Build for Linux"
	@echo "  clean         - Clean build artifacts"
	@echo "  test          - Run tests"
	@echo "  deps          - Download dependencies"
	@echo "  run           - Build and run the server"
	@echo "  dev           - Run in development mode"
	@echo "  docker-build  - Build Docker image"
	@echo "  docker-run    - Run Docker container"
	@echo "  fmt           - Format code"
	@echo "  vet           - Run go vet"
	@echo "  lint          - Run linter"
