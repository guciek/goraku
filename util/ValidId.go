// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

package util

func ValidId(s string) bool {
    if len(s) < 1 { return false }
    for _, b := range []byte(s) {
        if (b >= 97) && (b <= 122) { continue }
        if (b >= 48) && (b <= 57) { continue }
        if b == 95 { continue }
        return false
    }
    return true
}
