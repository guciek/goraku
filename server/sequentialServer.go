// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

package server

func sequentialServer(s Server) Server {
    creq_in := make(chan Request)
    creq_out := make(chan Response)
    cfin_in := make(chan bool)
    cfin_out := make(chan error)
    go func() {
        loop: for {
            select {
                case r := <-creq_in:
                    creq_out <- s.Respond(r)
                case <-cfin_in:
                    cfin_out <- s.Finalize()
                    break loop
            }
        }
    }()
    finalized := false
    return Server {
        Respond: func(r Request) Response {
            if finalized { return Response {} }
            creq_in <- r
            return <-creq_out
        },
        Finalize: func() error {
            if finalized { return nil }
            finalized = true
            cfin_in <- true
            return <-cfin_out
        },
    }
}
