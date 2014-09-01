// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

package server

import (
	"github.com/guciek/goraku/pgman"
	"github.com/guciek/goraku/session"
	"github.com/guciek/goraku/util"
	"bytes"
	"strings"
	"time"
)

func respondPostDb(r Request, pm pgman.PageManager) Response {
	if !bytes.HasPrefix(r.Body, []byte("getdb;")) {
		return binResponse([]byte("Invalid query"))
	}
	return binResponse(jsonDb(pm))
}

func respondPostLogin(r Request, perm session.Permissions) Response {
	a := strings.Split(string(r.Body), ":")
	if len(a) != 2 { return binResponse([]byte("FAIL")) }
	a[0] = strings.TrimSpace(a[0])
	a[1] = strings.TrimSpace(a[1])
	time.Sleep(time.Second)
	if perm.Login(a[0], a[1]) {
		if perm.IsAdmin() { return binResponse([]byte("ADMIN")) }
		return binResponse([]byte("OK"))
	}
	return binResponse([]byte("FAIL"))
}

func respondPostFile(r Request, pm pgman.PageManager) Response {
	a := strings.Split(string(r.Body), "/")
	if (len(a) != 2) || (!util.ValidId(a[0]) || (!util.ValidFileName(a[1]))) {
		return notFound()
	}
	p := pm.ById(a[0])
	if p.Id == nil { return notFound() }
	d := p.File(a[1])
	if len(d) < 1 { return notFound() }
	return binResponse(append([]byte(a[0]+"/"+a[1]+"="), d...))
}

func respondPost(r Request, perm session.Permissions,
		pm pgman.PageManager) Response {
	switch strings.Split(r.Path[1:], "/")[0] {
		case "db": return respondPostDb(r, pm)
		case "login": return respondPostLogin(r, perm)
		case "file": return respondPostFile(r, pm)
	}
	return notFound()
}
