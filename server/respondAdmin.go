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
	"encoding/base64"
	"fmt"
	"strings"
)

func respondAdminDb(r Request, pm pgman.PageManager) Response {
	if !pm.HasWriteLock() { return binResponse([]byte("FAIL")) }
	if !bytes.HasPrefix(r.Body, []byte("getdb;")) {
		return binResponse([]byte("Invalid query"))
	}
	return binResponse(jsonDb(pm))
}

func respondAdminSetprops(r Request, pm pgman.PageManager) Response {
	lines := bytes.Split(r.Body, []byte("\n"))
	if len(lines) < 3 { return binResponse([]byte("Invalid query")) }
	id := string(lines[0])
	if (!util.ValidId(id)) || (string(lines[len(lines)-1]) != "..END..") {
		return binResponse([]byte("Invalid query"))
	}
	p := pm.ById(id)
	if p.Id == nil {
		var err error
		p, err = pm.Create(id)
		if (err != nil) || (p.Id == nil) {
			return binResponse([]byte("Page not found"))
		}
	}
	for _, line := range lines[1:len(lines)-1] {
		a := bytes.SplitN(line, []byte("="), 2)
		k := string(a[0])
		if (len(a) != 2) || (!util.ValidId(k)) { continue; }
		p.SetProperty(k, string(a[1]))
	}
	if err := pm.SyncChanges(); err != nil {
		return binResponse([]byte(fmt.Sprintf("Could not write: %v", err)))
	}
	return binResponse(append([]byte(id+"="), jsonPage(p)...))
}

func respondAdminDel(r Request, pm pgman.PageManager) Response {
	id := string(r.Body)
	if !util.ValidId(id) { return binResponse([]byte("Invalid query")) }
	p := pm.ById(id)
	if p.Id == nil { return binResponse([]byte("Page not found")) }
	if err := p.Remove(); err != nil {
		return binResponse([]byte(fmt.Sprintf("Could not write: %v", err)))
	}
	return binResponse([]byte(id+"=REMOVED"))
}

func cleanUpUnusedImages(p pgman.Page) {
	used := make(map[string]bool)
	p.ForEachFileName(func(f string) {
		if ! strings.HasSuffix(f, ".html") { return }
		d := string(p.File(f))
		for {
			next := strings.Index(d, " src=\"")
			if next < 0 { break }
			d = d[next+6:]
			next = strings.Index(d, "\"")
			if next < 0 { break }
			src := d[0:next]
			d = d[next+1:]
			next = strings.LastIndex(src, "/")
			if next >= 0 {
				src = src[next+1:]
			}
			used[src] = true
		}
	})
	p.ForEachFileName(func(f string) {
		if ! strings.HasPrefix(f, "img_") { return }
		if used[f] { return }
		p.WriteFile(f, nil)
	})
}

func decodeFileData(d []byte) []byte {
	if bytes.HasPrefix(d, []byte("empty:")) {
		return make([]byte, 0)
	}
	if bytes.HasPrefix(d, []byte("binary:")) {
		d = d[7:]
		if len(d) < 1 { return nil }
		return d
	}
	if bytes.HasPrefix(d, []byte("text:")) {
		d = d[5:]
		if len(d) < 1 { return nil }
		return d
	}
	if bytes.HasPrefix(d, []byte("base64:")) {
		d = d[7:]
		if len(d) < 1 { return nil }
		ret := make([]byte, base64.StdEncoding.DecodedLen(len(d)))
		n, err := base64.StdEncoding.Decode(ret, d)
		if err != nil { return nil }
		return ret[0:n]
	}
	return nil
}

func respondAdminSetfile(r Request, pm pgman.PageManager) Response {
	i := bytes.IndexByte(r.Body, '=')
	if i < 1 { return binResponse([]byte("Invalid query")) }
	a := strings.Split(string(r.Body[0:i]), "/")
	r.Body = decodeFileData(r.Body[i+1:])
	if (len(a) != 2) || (r.Body == nil) ||
			(!util.ValidId(a[0]) || (!util.ValidFileName(a[1]))) {
		return binResponse([]byte("Invalid query"))
	}
	p := pm.ById(a[0])
	if p.Id == nil { return binResponse([]byte("Page not found")) }
	d := p.File(a[1])
	if bytes.Compare(d, r.Body) == 0 {
		if strings.HasSuffix(a[1], ".html") {
			cleanUpUnusedImages(p)
		}
		return binResponse([]byte("No changes"))
	}
	if err := p.WriteFile(a[1], r.Body); err != nil {
		return binResponse([]byte(fmt.Sprintf("Could not write: %v", err)))
	}
	if strings.HasSuffix(a[1], ".html") {
		cleanUpUnusedImages(p)
	}
	return binResponse(append([]byte(a[0]+"="), jsonPage(p)...))
}

func respondAdmin(r Request, perm session.Permissions,
		pm pgman.PageManager) Response {
	if !perm.IsAdmin() { return notFound() }
	switch r.Path {
		case "/admin/getdb": return respondAdminDb(r, pm)
		case "/admin/setprops": return respondAdminSetprops(r, pm)
		case "/admin/del": return respondAdminDel(r, pm)
		case "/admin/setfile": return respondAdminSetfile(r, pm)
	}
	return notFound()
}
