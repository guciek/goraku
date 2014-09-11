// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

package log

import (
    "fmt"
    "os"
    "time"
)

func FileLogger(fname string) (Logger, error) {
    f, err := os.OpenFile(fname, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
    if err != nil { return Logger {}, err }
    addline := func(line string) {
        line = fmt.Sprintf("[%s, PID=%d] %s\n",
            time.Now().UTC().Format("2006-01-02 15:04:05 UTC"),
            os.Getpid(), line)
        f.WriteString(line)
    }
    return Logger {
        Message: func(line string, params ...interface{}) {
            addline(fmt.Sprintf(line, params...))
        },
        Error: func(line string, params ...interface{}) {
            addline(fmt.Sprintf("Error: "+line, params...))
        },
        Finalize: func() error {
            return f.Close()
        },
    }, nil
}
