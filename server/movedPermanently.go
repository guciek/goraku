// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

package server

func movedPermanently(url string) Response {
    return Response {
        Code: 301,
        Headers: map[string]string {
            "Location": url,
            "Content-Type": "text/html",
            "Cache-Control": "max-age=86400",
        },
        Body: []byte("<a href=\""+url+"\">page moved</a>\n"),
    }
}
