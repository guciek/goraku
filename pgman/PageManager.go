// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

package pgman

type PageManager struct {
    HasWriteLock func() bool
    DropWriteLock func()
    ById func(string) Page
    Create func(string) (Page, error)
    ForEach func(func(Page))
    SyncChanges func() error
    Finalize func() error
}
