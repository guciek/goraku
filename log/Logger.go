// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

package log

type Logger struct {
    Message func(string, ...interface{})
    Error func(string, ...interface{})
}
