// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

package pgman

import (
    "github.com/guciek/goraku/util"
    "bytes"
    "fmt"
    "io/ioutil"
    "os"
)

type managedPageData struct {
    Page
    syncChanges func() error
}

func managedPage(dir string, id string, writeAllowed func() bool,
        onRemove func()) managedPageData {
    var cachedErr error = nil
    removed := false
    props := make(map[string]string)
    propsInitzd := false
    propsModified := false
    initProps := func() {
        if propsInitzd { return }
        if _, err := os.Stat(dir+"/"+id+"/properties"); err != nil {
            propsInitzd = true
            return
        }
        data, err := ioutil.ReadFile(dir+"/"+id+"/properties")
        if err != nil {
            if cachedErr == nil { cachedErr = err }
            return
        }
        propsInitzd = true
        for _, line := range bytes.Split(data, []byte {10}) {
            p := bytes.IndexByte(line, 61)
            if (p > 0) && util.ValidId(string(line[0:p])) {
                props[string(line[0:p])] = string(line[p+1:])
            }
        }
    }
    return managedPageData {
        Page: Page {
            Id: func() string {
                if removed { return "" }
                return id
            },
            ForEachProperty: func(onprop func(string, string)) {
                if removed { return }
                initProps()
                for k, v := range props {
                    if len(v) >= 1 { onprop(k, v) }
                }
                if (id == "index") && (len(props["title_en"]) < 1) {
                    onprop("title_en", "Index")
                }
            },
            Property: func(k string) string {
                if removed { return "" }
                if !util.ValidId(k) { return "" }
                initProps()
                if (id == "index") && (k == "title_en") && (len(props[k]) < 1) {
                    return "Index"
                }
                return props[k]
            },
            SetProperty: func(k string, v string) {
                {
                    emsg := ""
                    if removed { emsg = "can't write: removed page" }
                    if !util.ValidId(k) { emsg = "invalid property id" }
                    if !writeAllowed() { emsg = "write not allowed" }
                    if emsg != "" {
                        if (cachedErr == nil) {
                            cachedErr = fmt.Errorf(emsg);
                        }
                        return;
                    }
                }
                initProps()
                if !propsInitzd { return }
                if props[k] == v { return }
                propsModified = true
                if len(v) >= 1 {
                    props[k] = v
                } else {
                    delete(props, k)
                }
            },
            HasFile: func(f string) bool {
                if !util.ValidFileName(f) { return false }
                _, err := os.Stat(dir+"/"+id+"/"+f)
                return err == nil
            },
            ForEachFileName: func(onfile func(string)) {
                if removed { return }
                d, err := ioutil.ReadDir(dir+"/"+id)
                if err != nil { return }
                for _, f := range d {
                    if (!f.IsDir()) && util.ValidFileName(f.Name()) {
                        onfile(f.Name())
                    }
                }
            },
            File: func(f string) []byte {
                if removed { return nil }
                if !util.ValidFileName(f) { return nil }
                data, err := ioutil.ReadFile(dir+"/"+id+"/"+f)
                if err != nil { return nil }
                return data
            },
            WriteFile: func(f string, data []byte) error {
                if !writeAllowed() {
                    return fmt.Errorf("write not allowed")
                }
                if !util.ValidFileName(f) {
                    return fmt.Errorf("can't write file: invalid name")
                }
                if removed {
                    return fmt.Errorf("can't write file: removed page")
                }
                fpath := dir+"/"+id+"/"+f
                if len(data) < 1 {
                    if _, err := os.Stat(fpath); err != nil { return nil }
                    return os.Remove(fpath)
                }
                return ioutil.WriteFile(fpath, data, 0600)
            },
            Remove: func() error {
                if !writeAllowed() {
                    return fmt.Errorf("write not allowed")
                }
                if id == "index" {
                    return fmt.Errorf("can't remove index page")
                }
                if removed {
                    return fmt.Errorf("can't remove page: already removed")
                }
                d, err := ioutil.ReadDir(dir+"/"+id)
                if err != nil { return err }
                propsFile := false
                for _, f := range d {
                    if f.Name() == "properties" {
                        propsFile = true
                    } else {
                        return fmt.Errorf("can't remove page: dir not empty")
                    }
                }
                if propsFile {
                    err = os.Remove(dir+"/"+id+"/properties")
                    if err != nil { return err }
                }
                err = os.Remove(dir+"/"+id)
                if err != nil { return err }
                removed = true
                onRemove()
                return nil
            },
        },
        syncChanges: func() (err error) {
            if removed { return }
            if propsModified {
                var data []byte
                for k, v := range props {
                    data = append(data, []byte(k+"="+v+"\n")...)
                }
                err = ioutil.WriteFile(dir+"/"+id+"/properties", data, 0600)
                if err != nil { return }
                propsModified = false
            }
            if cachedErr != nil {
                err, cachedErr = cachedErr, nil
            }
            return
        },
    }
}
