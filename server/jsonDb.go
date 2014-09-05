// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

package server

import (
	"github.com/guciek/goraku/pgman"
	"bytes"
	"encoding/json"
)

func jsonPage(p pgman.Page) []byte {
	var buf bytes.Buffer
	buf.WriteString("{")
		buf.WriteString("props:{")
			var fistprop = true;
			p.ForEachProperty(func(k, v string) {
				if !fistprop { buf.WriteString(",") }
				fistprop = false;
				b, err := json.Marshal(v)
				if err != nil { panic(err) }
				buf.WriteString(k)
				buf.WriteString(":")
				buf.Write(b)
			})
		buf.WriteString("},")
		buf.WriteString("files:[")
			var fistfile = true;
			p.ForEachFileName(func(f string) {
				if !fistfile { buf.WriteString(",") }
				fistfile = false;
				b, err := json.Marshal(f)
				if err != nil { panic(err) }
				buf.Write(b)
			})
		buf.WriteString("]")
	buf.WriteString("}")
	return buf.Bytes()
}

func jsonDb(pm pgman.PageManager) []byte {
	var buf bytes.Buffer
	buf.WriteString("{")
	var first = true;
	pm.ForEach(func(p pgman.Page) {
		if !first { buf.WriteString(",") }
		first = false;
		buf.WriteRune('"')
		buf.WriteString(p.Id())
		buf.WriteString("\":")
		buf.Write(jsonPage(p))
	})
	buf.WriteString("}")
	return buf.Bytes()
}
