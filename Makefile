# Makefile for Quinta

TARGET = aarch64-unknown-linux-gnu
BIN = quinta
HOST = fpi@k3s-node-1
REMOTE_DIR = /opt/quinta

.PHONY: all fmt test build deploy clean

all: fmt test build

fmt:
	cargo fmt --all

test:
	cargo test

build:
	cargo build --bin $(BIN) --release --target $(TARGET)

deploy: build
	rsync -avz static $(HOST):$(REMOTE_DIR)/
	rsync -avz target/$(TARGET)/release/$(BIN) $(HOST):$(REMOTE_DIR)/
	ssh $(HOST) "sudo systemctl restart quinta"

clean:
	cargo clean

