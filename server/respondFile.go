// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

package server

import (
	"github.com/guciek/goraku/data"
	"github.com/guciek/goraku/pgman"
	"github.com/guciek/goraku/session"
	"github.com/guciek/goraku/util"
	"strings"
)

func respondFile(r Request, perm session.Permissions,
		pm pgman.PageManager) Response {
	mimeTypes := map[string]string {
		"css": "text/css",
		"ico": "image/x-icon",
		"jpg": "image/jpeg",
		"js": "application/x-javascript",
		"png": "image/png",
	}
	var mime string
	{
		s := strings.Split(r.Path, ".")
		if len(s) < 2 { return notFound() }
		mime = mimeTypes[s[len(s)-1]]
		if len(mime) < 1 { return notFound() }
	}

	if r.Path == "/favicon.ico" { r.Path = "/file"+r.Path }
	if ! strings.HasPrefix(r.Path, "/file/") { return notFound() }
	r.Path = r.Path[6:]

	if strings.HasPrefix(r.Path, "admin") && (!perm.IsAdmin()) {
		return notFound()
	}

	if util.ValidFileName(r.Path) {
		d := data.ByPath("http/"+r.Path)
		if len(d) < 1 { return notFound() }
		return Response {
			Code: 200,
			Headers: map[string]string {
				"Content-Type": mime,
				"Cache-Control": "max-age=86400",
			},
			Body: d,
		}
	}

	if pos := strings.IndexByte(r.Path, '/'); pos > 0 {
		pid, fname := r.Path[0:pos], r.Path[pos+1:]
		if ! util.ValidId(pid) { return notFound() }
		if ! util.ValidFileName(fname) { return notFound() }
		p := pm.ById(pid)
		if p.Id == nil { return notFound() }
		d := p.File(fname)
		if len(d) < 1 { return notFound() }
		return Response {
			Code: 200,
			Headers: map[string]string {
				"Content-Type": mime,
				"Cache-Control": "max-age=86400",
			},
			Body: d,
		}
	}

	return notFound()
}
