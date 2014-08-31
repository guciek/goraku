// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

package session

import (
	"github.com/guciek/goraku/data"
	"crypto/rand"
	"encoding/hex"
	"io"
	"io/ioutil"
	"strings"
)

func randomSID() string {
	buf := make([]byte, 12)
	n, err := io.ReadFull(rand.Reader, buf)
	if (err != nil) || (n < len(buf)) { panic("could not generate random data") }
	return hex.EncodeToString(buf)
}

func readSIDCookie(cookies string) string {
	for _, s := range strings.Split(cookies, ";") {
		k_v := strings.SplitN(s, "=", 2)
		if strings.TrimSpace(k_v[0]) == "SID" {
			return strings.TrimSpace(k_v[1])
		}
	}
	return ""
}

func onRequest(dir, cookies string) Permissions {
	adminSIDFile := dir+"/session.tmp"
	SID := readSIDCookie(cookies)

	adminSID := ""
	if SID != "" {
		data, err := ioutil.ReadFile(adminSIDFile)
		if err == nil {
			adminSID = strings.TrimSpace(string(data))
		}
	}
	isAdmin := func() bool {
		return (adminSID != "") && (SID == adminSID)
	}

	return Permissions {
		IsAdmin: isAdmin,
		Login: func(user, pass string) bool {
			d := data.AdminPass()
			ds := strings.TrimSpace(string(d))
			if len(ds) < 1 { return false }
			if user+":"+pass == ds {
				adminSID = randomSID()
				ioutil.WriteFile(adminSIDFile, []byte(adminSID+"\n"), 0600)
				SID = adminSID
				return true
			}
			return false
		},
		Logout: func() {
			SID = ""
		},
		NewHeaders: func(onheader func(k, v string)) {
			if readSIDCookie(cookies) != SID {
				onheader("Set-Cookie", "SID="+SID+"")
			}
		},
	}
}

func FolderSessionManager(dir string) SessionManager {
	return SessionManager {
		OnRequest: func(cookies string) Permissions {
			return onRequest(dir, cookies)
		},
		Finalize: func() error { return nil },
	}
}
