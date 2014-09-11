// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

package server

import (
    "github.com/guciek/goraku/log"
    "fmt"
)

func DefaultServer(logger log.Logger) (Server, error) {
    var s Server
    {
        var err error
        s, err = pageServer(logger)
        if err != nil { return Server {}, err }
    }

    return sequentialServer(Server {
        Respond: func(r Request) Response {
            defer func() {
                if err := recover(); err != nil {
                    logger.Error("unhandled (respond): %v", err)
                }
            }()
            return s.Respond(r)
        },
        Finalize: func() (ret error) {
            defer func() {
                if err := recover(); err != nil {
                    ret = fmt.Errorf("unhandled (finalize): %v", err)
                }
            }()
            return s.Finalize()
        },
    }), nil
}
