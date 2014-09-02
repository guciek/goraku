// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

package server

import (
	"github.com/guciek/goraku/log"
	"github.com/guciek/goraku/pgman"
	"github.com/guciek/goraku/session"
	"strings"
	"time"
)

func pageServer(logger log.Logger) (Server, error) {
	var pagesDir = "./pages";

	var sm = session.FolderSessionManager(".")

	var pm pgman.PageManager
	var pm_reloaded time.Time
	{
		var err error
		pm, err = pgman.FolderPageManager(pagesDir, false)
		if err != nil { return Server {}, err }
		pm_reloaded = time.Now()
	}

	reloadPm := func(writeLock bool) {
		pm_reloaded = time.Now()
		if err := pm.Finalize(); err != nil {
			logger.Error("could not finalize page manager: %v", err)
			return
		}
		new_pm, err := pgman.FolderPageManager(pagesDir, writeLock)
		if err != nil {
			logger.Error("reload: %v", err)
			return
		}
		pm = new_pm
	}

	return Server {
		Respond: func(r Request) (response Response) {
			defer func() {
				pm.DropWriteLock()
			}()
			perm := sm.OnRequest(r.Headers["cookie"])
			if perm.IsAdmin() && strings.HasPrefix(r.Path, "/admin/") {
				if !pm.HasWriteLock() { reloadPm(true) }
				response = respondAdmin(r, perm, pm)
			} else {
				if time.Now().Sub(pm_reloaded) > time.Hour {
					reloadPm(false)
				}
				response = respond(r, perm, pm)
			}
			perm.NewHeaders(func(k, v string) {
				response.Headers[k] = v
			})
			return response
		},
		Finalize: func() (retError error) {
			if err := sm.Finalize(); err != nil { retError = err }
			if err := pm.Finalize(); err != nil { retError = err }
			if retError == nil { logger.Message("Clean exit.") }
			return
		},
	}, nil
}
