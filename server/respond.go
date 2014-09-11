// Copyright by Karol Guciek (http://guciek.github.io)
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 2 or 3.

package server

import (
    "github.com/guciek/goraku/data"
    "github.com/guciek/goraku/pgman"
    "github.com/guciek/goraku/session"
    "github.com/guciek/goraku/util"
    "bytes"
    "fmt"
    "strings"
)

func pageSubs(pm pgman.PageManager, parent pgman.Page, lang string) []byte {
    var buf bytes.Buffer
    pm.ForEach(func(p pgman.Page) {
        if p.Property("parent") != parent.Id() {
            if (parent.Property("type") != "tag") ||
                (p.Property("type") == "tag") { return; }
            found := false
            for _, t := range strings.Split(p.Property("tags"), ",") {
                if t == parent.Id() {
                    found = true
                }
            }
            if !found { return }
        }
        title := p.Property("title_"+lang)
        if len(title) < 1 { return }
        buf.WriteString("<li><a href=\"/"+p.Id()+"/"+lang+"\">")
            if p.HasFile("icon.jpg") {
                buf.WriteString("<img src=\"/file/"+p.Id()+
                    "/icon.jpg\" alt=\"[icon]\"/>")
            }
            buf.WriteString(util.StripHtml(title))
        buf.WriteString("</a></li>")
    })
    return buf.Bytes()
}

func pageParent(pm pgman.PageManager, child pgman.Page, lang string) []byte {
    p := pm.ById(child.Property("parent"))
    if p.Id == nil { return nil }
    title := p.Property("title_"+lang)
    if len(title) < 1 { return nil }
    return []byte("<span><a href=\"/"+p.Id()+"/"+lang+"\">"+
        util.StripHtml(title)+"</a></span>")
}

func parseTemplate(t []byte, tags map[string][]byte) ([]byte, error) {
    var buf bytes.Buffer
    for {
        pos := bytes.Index(t, []byte("[[["))
        if pos < 0 {
            buf.Write(t)
            break
        }
        buf.Write(t[0:pos])
        t = t[pos+3:]
        pos = bytes.Index(t, []byte("]]]"))
        if pos < 0 {
            return nil, fmt.Errorf("invalid template")
        }
        tag := string(t[0:pos])
        if tags[tag] != nil {
            buf.Write(tags[tag])
        }
        t = t[pos+3:]
    }
    return buf.Bytes(), nil
}

func respond(r Request, perm session.Permissions,
        pm pgman.PageManager) Response {
    if !strings.HasPrefix(r.Path, "/") { r.Path = "/" }
    path := r.Path[1:]
    if len(path) < 1 { return movedPermanently("/index/en") }
    if len(r.Body) > 0 { return respondPost(r, perm, pm) }
    if strings.IndexRune(path, '.') >= 0 { return respondFile(r, perm, pm) }

    var pageid, lang string
    {
        p := strings.IndexRune(path, '/')
        if p < 1 { return notFound() }
        pageid = path[0:p]
        lang = path[p+1:]
        if !util.ValidId(pageid) { return notFound() }
        if !util.ValidId(lang) { return notFound() }
    }

    page := pm.ById(pageid)
    if page.Id == nil { return notFound() }

    title := page.Property("title_"+lang)
    if len(title) < 1 { return notFound() }

    body, err := parseTemplate(
        data.TemplateXhtml(),
        map[string][]byte {
            "LANG": []byte(lang),
            "TITLE": []byte(util.StripHtml(title)),
            "CONTENT": page.File(lang+".html"),
            "SUBS": pageSubs(pm, page, lang),
            "PARENT": pageParent(pm, page, lang),
        },
    )

    if err != nil {
        panic(fmt.Sprintf("could not parse template: %v", err))
    }

    return Response {
        Code: 200,
        Headers: map[string]string {
            "Content-Type": "text/html",
            "Cache-Control": "no-cache",
        },
        Body: body,
    }
}
