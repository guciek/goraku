// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

package pgman

import (
	"github.com/guciek/goraku/util"
	"fmt"
	"io/ioutil"
	"os"
	"sort"
)

func FolderPageManager(dir string, writeLock bool) (PageManager, error) {
	if _, err := os.Stat(dir); err != nil {
		err = os.Mkdir(dir, 0700)
		if err != nil { return PageManager {}, err }
	}

	if writeLock {
		err := os.Mkdir(dir+"/write.lock", 0700)
		if err != nil { return PageManager {}, err }
	}

	hasWriteLock := func() bool {
		return writeLock
	}

	var pages = make(map[string]managedPageData)
	var cleanPages = func() {
		for id, p := range pages {
			if (p.Id == nil) || (p.Id() != id) {
				delete(pages, id)
			}
		}
	}
	{
		d, err := ioutil.ReadDir(dir)
		if err != nil { return PageManager {}, err }
		for _, f := range d {
			if f.IsDir() && util.ValidId(f.Name()) {
				pages[f.Name()] = managedPage(dir, f.Name(),
					hasWriteLock, cleanPages)
			}
		}
		if pages["index"].Id == nil {
			err = os.Mkdir(dir+"/index", 0700)
			if err != nil { return PageManager {}, err }
			pages["index"] = managedPage(dir, "index", hasWriteLock, cleanPages)
		}
	}

	syncChanges := func() (returnErr error) {
		for _, p := range pages {
			if err := p.syncChanges(); (err != nil) && (returnErr == nil) {
				returnErr = err
			}
		}
		return
	}

	dropLock := func() {
		syncChanges()
		if writeLock {
			if os.Remove(dir+"/write.lock") == nil { writeLock = false }
		}
	}

	return PageManager {
		HasWriteLock: hasWriteLock,
		DropWriteLock: dropLock,
		ById: func(id string) Page {
			return pages[id].Page
		},
		Create: func(id string) (p Page, err error) {
			if !writeLock {
				return Page {}, fmt.Errorf("write not allowed without lock")
			}
			if !util.ValidId(id) {
				err = fmt.Errorf("can't create page: invalid id")
				return
			}
			err = os.Mkdir(dir+"/"+id, 0700)
			if err != nil { return }
			pages[id] = managedPage(dir, id, hasWriteLock, cleanPages)
			p = pages[id].Page
			return
		},
		ForEach: func(onpage func(Page)) {
			ids := make([]string, 0, len(pages))
			for id := range pages {
				ids = append(ids, id)
			}
			sort.Strings(ids)
			for _, id := range ids {
				onpage(pages[id].Page)
			}
		},
		SyncChanges: syncChanges,
		Finalize: func() error {
			err := syncChanges()
			dropLock()
			return err
		},
	}, nil
}
