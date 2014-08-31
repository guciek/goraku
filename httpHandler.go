// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

package main

import (
	"github.com/guciek/goraku/data"
	"github.com/guciek/goraku/server"
	"fmt"
	"io"
	"net/http"
	"strings"
)

type httpHandler func(server.Request) server.Response

func (respond httpHandler) ServeHTTP(hw http.ResponseWriter, hr *http.Request) {
	request := server.Request {
		Path: hr.URL.Path,
		Headers: make(map[string]string),
		Body: nil,
	}
	for k, vs := range hr.Header {
		request.Headers[strings.ToLower(k)] = strings.Join(vs, ";")
	}
	if hr.Body != nil {
		buf := make([]byte, 65536)
		for {
			n, err := hr.Body.Read(buf)
			if (err == io.EOF) || (err == nil) {
				request.Body = append(request.Body, buf[0:n]...)
			} else {
				request.Body = nil
			}
			if err != nil { break }
			if len(request.Body) > 2*1024*1024 {
				request.Body = nil
				break
			}
		}
		hr.Body.Close()
	}
	response := respond(request)
	if (response.Code < 100) || (len(response.Headers["Content-Type"]) < 1) ||
			(len(response.Body) < 1) {
		response.Code = 500
		response.Headers = map[string]string { "Content-Type:": "text/html" }
		response.Body = data.Error500Html()
	}
	response.Headers["Content-Length"] = fmt.Sprintf("%d", len(response.Body))
	for k, v := range response.Headers {
		hw.Header().Set(k, v)
	}
	hw.WriteHeader(response.Code)
	hw.Write([]byte(response.Body))
}
