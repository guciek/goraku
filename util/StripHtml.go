// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

package util

import (
    "bytes"
)

func StripHtml(s string) string {
    var buf bytes.Buffer
    for _, b := range []byte(s) {
        if b < 32 { continue }
        if b == 38 { continue }
        if b == 60 { continue }
        if b == 62 { continue }
        buf.WriteByte(b)
    }
    return buf.String()
}
