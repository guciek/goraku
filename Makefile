# Copyright by Karol Guciek (http://guciek.github.io)
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, version 2 or 3.

DATAFILES := $(shell find data/files -type f)
GOFILES := $(shell find . -type f -name '*.go')
export GOPATH=$(shell pwd)

bin/goraku.fcgi: Makefile data/data.go $(GOFILES)
	@mkdir -p bin src/github.com/guciek
	@ln -s ../../.. src/github.com/guciek/goraku
	go build -o $@ github.com/guciek/goraku
	strip $@

data/data.go: Makefile gendata.py jsstrip.py $(DATAFILES)
	./gendata.py $@
