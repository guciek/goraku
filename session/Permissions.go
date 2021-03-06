// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

package session

type Permissions struct {
    IsAdmin func() bool
    Login func(user, pass string) bool
    Logout func()
    NewHeaders func(func(k, v string))
}
