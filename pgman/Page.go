// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

package pgman

type Page struct {
    Id func() string
    ForEachProperty func(func(string, string))
    Property func(string) string
    SetProperty func(string, string)
    ForEachFileName func(func(string))
    HasFile func(string) bool
    File func(string) []byte
    WriteFile func(string, []byte) error
    Remove func() error
}
