// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

package main

import (
	"github.com/guciek/goraku/log"
	"github.com/guciek/goraku/server"
	"fmt"
	"net/http"
	"net/http/fcgi"
	"os"
	"os/signal"
	"syscall"
)

func run(listenPort int) {
	var logger log.Logger
	{
		var err error
		if listenPort > 0 {
			logger, err = log.StderrLogger()
		} else {
			logger, err = log.FileLogger("log.txt")
		}
		if err != nil { panic(fmt.Sprintf("could not start log: %v", err)) }
		defer logger.Finalize()
	}

	var serv server.Server
	{
		var err error
		serv, err = server.DefaultServer(logger)
		if err != nil {
			logger.Error("could not start server: %v", err)
			panic(fmt.Sprintf("could not start server: %v", err))
		}
		defer serv.Finalize()
	}

	if listenPort <= 0 {
		defer func() {
			if err := recover(); err != nil {
				logger.Error("%v", err)
				panic(err)
			}
		}()
	}

	go func() {
		s := make(chan os.Signal, 1)
		signal.Notify(s, syscall.SIGINT, syscall.SIGTERM, syscall.SIGKILL)
		<-s
		if err := serv.Finalize(); err != nil {
			logger.Error(err.Error())
		}
		if err := logger.Finalize(); err != nil {
			os.Exit(43)
		}
		os.Exit(0)
	}()

	if listenPort > 0 {
		logger.Message("Starting server on port %v...", listenPort)
		err := http.ListenAndServe(fmt.Sprintf(":%v", listenPort),
			httpHandler(serv.Respond))
		if err != nil { panic(err.Error()) }
	} else {
		logger.Message("Starting in FCGI mode...")
		err := fcgi.Serve(nil, httpHandler(serv.Respond))
		if err != nil { panic(err.Error()) }
	}
	panic("interrupted")
}
