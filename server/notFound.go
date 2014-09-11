// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

package server

import (
    "github.com/guciek/goraku/data"
)

func notFound() Response {
    d := data.Error404Html()
    if len(d) < 1 { panic("error page not found") }
    return Response {
        Code: 404,
        Headers: map[string]string { "Content-Type": "text/html" },
        Body: d,
    }
}
