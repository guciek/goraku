// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

package main

import (
	"flag"
	"fmt"
	"os"
)

func main() {
	defer func() {
		if err := recover(); err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			os.Exit(1)
		}
	}()

	var listenPort = flag.Int("listen", 0, "start a http server on this port")
	flag.Parse()
	if flag.NArg() > 0 {
		panic(fmt.Sprintf("unknown argument: %v", flag.Arg(0)))
	}

	run(*listenPort)
}
