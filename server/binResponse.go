// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

package server

func binResponse(response []byte) Response {
    return Response {
        Code: 200,
        Headers: map[string]string {
            "Content-Type": "application/octet-stream",
        },
        Body: response,
    }
}
