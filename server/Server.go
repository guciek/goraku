// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

package server

type Request struct {
	Path string
	Headers map[string]string
	Body []byte
}

type Response struct {
	Code int
	Headers map[string]string
	Body []byte
}

type Server struct {
	Respond func(Request) Response
	Finalize func() error
}
