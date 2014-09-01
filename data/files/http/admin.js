
(function () {
    "use strict";

    var db,
        makeWindow,
        postRequest,
        error = showError;

    function makeSet() {
        var es = [];
        return {
            add: function (e) {
                var i;
                for (i = 0; i < es.length; i += 1) {
                    if (es[i] === e) { return false; }
                }
                es.push(e);
                return true;
            },
            remove: function (e) {
                var i;
                for (i = 0; i < es.length; i += 1) {
                    if (es[i] === e) {
                        es.splice(i, 1);
                        return true;
                    }
                }
                return false;
            },
            removeAll: function () {
                es = [];
            },
            contains: function (e) {
                var i;
                for (i = 0; i < es.length; i += 1) {
                    if (es[i] === e) {
                        return true;
                    }
                }
                return false;
            },
            forEach: function (f) {
                var i, copy = [];
                for (i = 0; i < es.length; i += 1) {
                    copy.push(es[i]);
                }
                for (i = 0; i < copy.length; i += 1) {
                    f(copy[i]);
                }
            }
        };
    }

    function makeEvent() {
        var callbacks = makeSet();
        return {
            add: callbacks.add,
            remove: callbacks.remove,
            removeAll: callbacks.removeAll,
            fire: function (p1, p2, p3) {
                callbacks.forEach(function (callback) {
                    try {
                        callback(p1, p2, p3);
                    } catch (err) {
                        error(err);
                    }
                });
            }
        };
    }

    function sortByFunc(arr, func) {
        var sorted = [];
        arr.forEach(function (a) {
            sorted.push([a, func(a)]);
        });
        sorted.sort(function (a, b) {
            if (a[1] > b[1]) { return 1; }
            if (a[1] < b[1]) { return -1; }
            return 0;
        });
        arr = [];
        sorted.forEach(function (a) {
            arr.push(a[0]);
        });
        return arr;
    }

    function input_text(action) {
        var e = document.createElement("input");
        e.type = "text";
        if (action) {
            e.onkeypress = function (ev) {
                ev = ev || window.event;
                var c = ev.which || ev.keyCode;
                if (c !== 13) { return true; }
                try {
                    action();
                } catch (err) {
                    error(err);
                }
                if (ev) { ev.preventDefault(); }
                return false;
            };
        }
        return e;
    }

    function input_submit(tit, action) {
        var active = true, e = document.createElement("input");
        e.type = "submit";
        e.value = String(tit);
        e.style.cursor = "pointer";
        e.onclick = function (ev) {
            try {
                if (active) {
                    active = false;
                    e.style.cursor = "default";
                    try { e.style.opacity = 0.5; } catch (ignore) {}
                    action(function () {
                        active = true;
                        e.style.cursor = "pointer";
                        try { e.style.opacity = 1; } catch (ignore) {}
                    });
                }
            } catch (err) {
                error(err);
            }
            if (ev) { ev.preventDefault(); }
            return false;
        };
        return e;
    }

    function span(content) {
        var e = document.createElement("span");
        if (content) {
            if (typeof content === "object") {
                e.appendChild(content);
            } else {
                e.textContent = String(content);
            }
        }
        return e;
    }

    function link(tit, action) {
        var e = span(tit);
        e.style.color = "#005";
        e.onmouseout = function () {
            e.style.color = "#005";
        };
        e.onmouseover = function () {
            e.style.color = "#55a";
        };
        e.onclick = function (ev) {
            try {
                action();
            } catch (err) {
                error(err);
            }
            if (ev) { ev.preventDefault(); }
            return false;
        };
        e.style.cursor = "pointer";
        return e;
    }

    function sanitize_id(s) {
        var i, c, ret = "";
        s = String(s);
        for (i = 0; i < s.length; i += 1) {
            c = s.charCodeAt(i);
            if (((c >= 97) && (c <= 122)) || ((c >= 48) && (c <= 57)) ||
                    (c === 95)) {
                ret += String.fromCharCode(c);
            }
        }
        return ret;
    }

    function cleanHtml(inputHtml, imgBase) {
        var writeText, writeWhitespace, block, inline;
        function tagWriter(write, inner) {
            var t = "";
            function tclose() {
                var k, cc;
                if (inner && inner.close) { inner.close(); }
                if (t !== "") {
                    write('</');
                    for (k = 0; k < t.length; k += 1) {
                        cc = t.charAt(k);
                        if (cc.match(/\s/)) { break; }
                        write(cc);
                    }
                    write('>');
                    t = "";
                }
            }
            function topen(newt) {
                tclose();
                if (newt !== "") {
                    write('<' + newt + '>');
                    t = newt;
                }
            }
            return {
                open: topen,
                close: tclose,
                opened: function () { return t; }
            };
        }
        function ontag_a(tag) {
            var p, p2, href;
            p = tag.indexOf('href="', 2);
            if (p < 0) { return; }
            p += 6;
            p2 = tag.indexOf('"', p);
            if (p2 < 0) { p2 = tag.length; }
            href = tag.substring(p, p2);
            if ((href.charAt(0) === '/') ||
                    (href.substring(0, 7) === 'http://') ||
                    (href.substring(0, 8) === 'https://')) {
                inline.want('a href="' + href + '"');
            }
        }
        function ontag_img(tag) {
            var p, p2, src;
            p = tag.indexOf('src="', 2);
            if (p < 0) { return; }
            p += 5;
            p2 = tag.indexOf('"', p);
            if (p2 < 0) { return; }
            src = tag.substring(p, p2);
            if (src.substring(0, 5) !== "data:") {
                src = src.split("/");
                src = src[src.length - 1];
                src = imgBase + src;
            }
            block.want("p");
            inline.want("");
            writeWhitespace(" ");
            writeText('<img src="' + src + '" />');
            writeWhitespace(" ");
        }
        function ontag(originaltag) {
            var tag = originaltag.trim().toLowerCase();
            tag = tag.split(" ")[0];
            tag = tag.split("\t")[0];
            if (tag.charAt(0) === '/') {
                inline.want("");
                return;
            }
            tag = tag.split("/")[0];
            if (tag === "img") {
                ontag_img(originaltag);
                return;
            }
            if (tag === "div") {
                tag = "p";
            }
            if ((tag === "p") || (tag === "pre") ||
                    (tag === "h1") || (tag === "h2")) {
                block.want(tag);
                inline.want("");
                if ((tag === "pre") && (block.opened() === "pre")) {
                    writeText("<br />");
                } else {
                    block.close();
                }
            }
            if (tag === "br") {
                if (block.opened() === "pre") {
                    writeText("<br />");
                } else {
                    block.close();
                }
            }
            if (block.wanted() !== "p") { return; }
            if ((tag === "b") || (tag === "strong")) {
                inline.want("b");
            }
            if (tag === "i") {
                inline.want("i");
            }
            if (tag === "sup") {
                inline.want("sup");
            }
            if (tag === "a") {
                ontag_a(originaltag);
            }
        }
        function onamp(a) {
            a = a.toLowerCase();
            if (a === "nbsp") {
                writeWhitespace(" ");
            } else if (a.match(/^[a-z0-9#]+$/)) {
                writeText("&" + a + ";");
            }
        }
        function onchar(c) {
            if (c === '"') {
                writeText('&quot;');
            } else if (c === "'") {
                writeText('&#39;');
            } else if (c === "\\") {
                writeText('&#92;');
            } else if (c === "&") {
                writeText('&amp;');
            } else if (c.match(/\s/)) {
                writeWhitespace(c);
            } else {
                writeText(c);
            }
        }
        function do_parse() {
            var i = 0, find, c, h = inputHtml.split("\n").join("<br />");
            while (i < h.length) {
                c = h.charAt(i);
                i += 1;
                if (c === '<') {
                    find = h.indexOf('>', i);
                    if (find < 0) { break; }
                    ontag(h.substring(i, find));
                    i = find + 1;
                } else if (c === '&') {
                    find = h.indexOf(';', i);
                    if (find < 0) { break; }
                    onamp(h.substring(i, find));
                    i = find + 1;
                } else if (c !== '>') {
                    onchar(c);
                }
            }
        }
        return (function () {
            var result = "", wanted_inline = "", wanted_block = "p",
                whitespace_last = true, whitespace_buffered = 0;
            function result_append(s) {
                result += s;
            }
            inline = tagWriter(result_append);
            block = tagWriter(result_append, inline);
            block.want = function (t) {
                wanted_block = String(t);
                if (wanted_block.length < 1) { wanted_block = "p"; }
            };
            block.wanted = function () {
                return wanted_block;
            };
            inline.want = function (t) {
                wanted_inline = String(t);
            };
            inline.wanted = function () {
                return wanted_inline;
            };
            writeText = function (s) {
                s = String(s).trim();
                if (s.length < 1) { return; }
                if (block.opened() !== wanted_block) {
                    block.open(wanted_block);
                    whitespace_last = (wanted_block !== "pre");
                    whitespace_buffered = 0;
                }
                if (inline.opened() !== wanted_inline) {
                    inline.close();
                }
                if (s.substring(0, 3) === "<br") {
                    whitespace_buffered = 0;
                }
                if ((!whitespace_last) && (whitespace_buffered > 0)) {
                    whitespace_last = true;
                    while (whitespace_buffered > 0) {
                        whitespace_buffered -= 1;
                        result_append(" ");
                        if (block.opened() !== "pre") {
                            whitespace_buffered = 0;
                        }
                    }
                }
                if (inline.opened() !== wanted_inline) {
                    inline.open(wanted_inline);
                }
                result_append(s);
                whitespace_last = false;
            };
            writeWhitespace = function (s) {
                if (s.charCodeAt(0) === 9) {
                    whitespace_buffered += 4;
                } else {
                    whitespace_buffered += 1;
                }
            };
            do_parse();
            block.close();
            return result;
        }());
    }

    function makeDraggable(subject) {
        var onstart = makeEvent(),
            onmove = makeEvent(),
            onend = makeEvent(),
            is_dragging = false,
            x = -1000,
            y = -1000;
        function checkmoved(e, fireevent) {
            e = e || window.event;
            if (!e) { return false; }
            try { e.preventDefault(); } catch (ignore) {}
            if (e.changedTouches &&
                    (e.changedTouches.length >= 1)) {
                e = e.changedTouches[0];
            }
            if (!e.pageX) { return; }
            if (!e.pageY) { return; }
            var dx = e.pageX - x,
                dy = e.pageY - y;
            if ((dx === 0) && (dy === 0)) { return; }
            x = e.pageX;
            y = e.pageY;
            if (fireevent) {
                onmove.fire({x: x, y: y, dx: dx, dy: dy});
            }
        }
        function move(e) {
            checkmoved(e, true);
            return false;
        }
        function end(e) {
            checkmoved(e, true);
            if (is_dragging) {
                is_dragging = false;
                document.removeEventListener('mousemove', move, false);
                document.removeEventListener('mouseup', end, false);
                document.removeEventListener('touchmove', move, false);
                document.removeEventListener('touchend', end, false);
                onend.fire();
            }
            return false;
        }
        function start(e) {
            try { e.preventDefault(); } catch (ignore) {}
            if (!is_dragging) {
                checkmoved(e, false);
                is_dragging = true;
                document.addEventListener('mousemove', move, false);
                document.addEventListener('mouseup', end, false);
                document.addEventListener('touchmove', move, false);
                document.addEventListener('touchend', end, false);
                onstart.fire({x: x, y: y});
            }
            return false;
        }
        subject.addEventListener('mousedown', start, false);
        subject.addEventListener('touchstart', start, false);
        return {
            onstart: onstart,
            onmove: onmove,
            onend: onend,
            clean: function () {
                end();
                onstart.removeAll();
                onmove.removeAll();
                onend.removeAll();
                subject.removeEventListener('mousedown', start, false);
                subject.removeEventListener('touchstart', start, false);
            }
        };
    }

    function div(content) {
        var e = document.createElement("div");
        if (content) {
            if (typeof content === "object") {
                e.appendChild(content);
            } else {
                e.textContent = String(content);
            }
        }
        return e;
    }

    makeWindow = (function () {
        var windowNextZindex = 100,
            currentFocusedWindow,
            windowParent;
        return function (content, title, notCloseable) {
            var removed = false,
                close = div("X"),
                bar = div(title),
                inner = div(content),
                w = div(),
                drag;
            close.style.position = "absolute";
            close.style.top = close.style.right = "0px";
            close.style.width = close.style.height = "24px";
            close.style.fontWeight = "bold";
            close.style.cursor = "pointer";
            close.style.background = "#666";
            bar.style.overflow = "hidden";
            bar.style.background = "#666";
            bar.style.lineHeight = "24px";
            bar.style.color = "white";
            bar.style.fontSize = "13px";
            bar.style.textAlign = "center";
            bar.style.position = "relative";
            bar.style.height = "24px";
            bar.style.cursor = "move";
            if (!notCloseable) { bar.appendChild(close); }
            content.style.padding = "10px 10px";
            inner.style.border = "2px solid #666";
            inner.style.borderTop = "none";
            inner.style.background = "#eee";
            inner.style.overflow = "hidden";
            inner.style.minWidth = "200px";
            w.style.position = "fixed";
            w.style.border = "1px solid #ccc";
            if (currentFocusedWindow) {
                w.style.left = (currentFocusedWindow.get_x() + 20) + "px";
                w.style.top = (currentFocusedWindow.get_y() + 20) + "px";
            } else {
                w.style.left = "50px";
                w.style.top = "50px";
            }
            w.appendChild(bar);
            w.appendChild(inner);
            w.onfocus = function () {
                try {
                    close.style.background = "#666";
                    bar.style.background = "#666";
                    inner.style.border = "2px solid #666";
                    inner.style.borderTop = "none";
                    windowNextZindex += 1;
                    w.style.zIndex = windowNextZindex;
                    if (content.onfocus) { content.onfocus(); }
                } catch (err) {
                    error(err);
                }
            };
            w.onblur = function () {
                try {
                    close.style.background = "#aaa";
                    bar.style.background = "#aaa";
                    inner.style.border = "2px solid #aaa";
                    inner.style.borderTop = "none";
                    if (content.onblur) { content.onblur(); }
                } catch (err) {
                    error(err);
                }
            };
            if (currentFocusedWindow) {
                currentFocusedWindow.onblur();
            }
            currentFocusedWindow = w;
            w.onfocus();
            function onactivate() {
                if (w !== currentFocusedWindow) {
                    if (currentFocusedWindow) {
                        currentFocusedWindow.onblur();
                    }
                    currentFocusedWindow = w;
                    w.onfocus();
                }
                return true;
            }
            w.addEventListener('mousedown', onactivate, false);
            w.addEventListener('touchstart', onactivate, false);
            close.onmousedown = function (event) {
                event.stopPropagation();
            };
            function bounds() {
                var x = parseInt(w.style.left, 10),
                    y = parseInt(w.style.top, 10);
                if (window.innerWidth && window.innerHeight) {
                    if (x + 10 > window.innerWidth) {
                        x = window.innerWidth - 10;
                    }
                    if (y + 35 > window.innerHeight) {
                        y =  window.innerHeight - 35;
                    }
                }
                if (x < 10) { x = 10; }
                if (y < 10) { y = 10; }
                w.style.left = x + 'px';
                w.style.top = y + 'px';
            }
            bounds();
            setTimeout(bounds, 50);
            w.get_x = content.get_x = function () {
                return parseInt(w.style.left, 10);
            };
            w.get_y = content.get_y = function () {
                return parseInt(w.style.top, 10);
            };
            content.set_x = function (v) {
                w.style.left = v + 'px';
                bounds();
            };
            content.set_y = function (v) {
                w.style.top = v + 'px';
                bounds();
            };
            drag = makeDraggable(bar);
            drag.onmove.add(function (e) {
                content.set_x(content.get_x() + e.dx);
                content.set_y(content.get_y() + e.dy);
                bounds();
            });
            drag.onend.add(function () {
                if (content.ondragend) { content.ondragend(); }
            });
            if (!windowParent) {
                windowParent = div();
                document.documentElement.style.position = "relative";
                document.documentElement.appendChild(windowParent);
                windowParent.style.position = "absolute";
                windowParent.style.left = "0px";
                windowParent.style.top = "0px";
                windowParent.style.width = "100%";
                windowParent.style.zIndex = 1000;
            }
            windowParent.appendChild(w);
            close.onclick = content.close_window = function () {
                if (removed) { return; }
                removed = true;
                try {
                    if (currentFocusedWindow === w) {
                        w.onblur();
                        currentFocusedWindow = null;
                    }
                    w.parentNode.removeChild(w);
                    drag.clean();
                    if (content.onclose) { content.onclose(); }
                } catch (err) {
                    error(err);
                }
            };
        };
    }());

    function strToUint8Array(s) {
        var len = s.length, arr, i;
        arr = new Uint8Array(len);
        for (i = 0; i < len; i += 1) {
            arr[i] = s.charCodeAt(i);
        }
        return arr;
    }

    postRequest = (function () {
        var lockedCookie = String(document.cookie);
        return function (url, data, onresponse) {
            if (lockedCookie.length < 10) { return; }
            if (String(document.cookie) !== lockedCookie) {
                throw "The session has expired!";
            }
            var req = new XMLHttpRequest();
            req.open("POST", url, true);
            req.setRequestHeader("Content-Type", "application/octet-stream");
            req.onreadystatechange = function () {
                var status = Number(req.status);
                if (Number(req.readyState) < 4) { return; }
                try {
                    if (status === 200) {
                        onresponse(String(req.responseText));
                    } else if (status > 0) {
                        onresponse("", "HTTP code " + status);
                    } else {
                        onresponse("", "HTTP error");
                    }
                } catch (err) {
                    error(err);
                }
            };
            req.send(data);
        };
    }());

    function makeDbWrapper(data) {
        var children = {},
            pendingRequests = {},
            fileCache = {};
        function updChildren() {
            var id, parent;
            children = {};
            for (id in data) {
                if (data.hasOwnProperty(id)) {
                    parent = data[id].props.parent;
                    if (parent) {
                        if (children[parent]) {
                            children[parent].push(id);
                        } else {
                            children[parent] = [id];
                        }
                    }
                }
            }
        }
        updChildren();
        function wrappage(pid, skip) {
            if ((!data[pid]) && (skip !== "skipcheck")) { return undefined; }
            function findFile(fn) {
                if (!data[pid]) { return false; }
                var found = false;
                data[pid].files.forEach(function (f) {
                    found = found || (f === fn);
                });
                return found;
            }
            return {
                id: function () {
                    if (!data[pid]) { return ""; }
                    return pid;
                },
                prop: function (k) {
                    if (!data[pid]) { return ""; }
                    if (k === "parent") { return ""; }
                    var v = data[pid].props[k];
                    if (!v) { return ""; }
                    return String(v);
                },
                hasFile: findFile,
                onFileData: function (fn, ondata) {
                    if (!findFile(fn)) {
                        ondata("", "File does not exist");
                        return;
                    }
                    fn = pid + "/" + fn;
                    if (fileCache[fn]) {
                        ondata(fileCache[fn], "");
                        return;
                    }
                    if (pendingRequests[pid]) {
                        ondata("", "Request already pending");
                        return;
                    }
                    pendingRequests[pid] = 1;
                    postRequest("/file/" + fn, fn, function (resp, err) {
                        delete pendingRequests[pid];
                        if (err || (resp.substring(0, fn.length + 1) !== fn + "=")) {
                            if (!err) { err = "Could not load file data"; }
                            ondata("", err);
                            return;
                        }
                        resp = resp.substring(fn.length + 1);
                        fileCache[fn] = resp;
                        ondata(resp);
                    });
                },
                forEachChild: function (f, orderfunc) {
                    var wrapall = [];
                    if (!data[pid]) { return; }
                    if (!children[pid]) { return; }
                    if (!orderfunc) {
                        orderfunc = function (p) { return p.id(); };
                    }
                    children[pid].forEach(function (c) {
                        wrapall.push(wrappage(c));
                    });
                    sortByFunc(wrapall, orderfunc).forEach(f);
                },
                parent: function () {
                    var parentid;
                    if (!data[pid]) { return undefined; }
                    parentid = data[pid].props.parent;
                    if (!parentid) { return undefined; }
                    return wrappage(parentid);
                },
                forEachProp: function (onprop) {
                    if (!data[pid]) { return; }
                    var kk = Object.keys(data[pid].props);
                    kk.sort();
                    kk.forEach(function (k) {
                        var v = data[pid].props[k];
                        if (k !== "parent") {
                            if ((k.length > 0) && (v.length > 0)) {
                                onprop(k, v);
                            }
                        }
                    });
                },
                forEachFile: function (f) {
                    if (!data[pid]) { return; }
                    data[pid].files.sort();
                    data[pid].files.forEach(f);
                },
                writeProps: function (map, onerror) {
                    if ((!data[pid]) && (skip !== "skipcheck")) {
                        onerror("Page does not exist");
                        return;
                    }
                    var sendData = pid + "\n";
                    if (pendingRequests[pid]) {
                        onerror("Request already pending");
                        return;
                    }
                    pendingRequests[pid] = 1;
                    Object.keys(map).forEach(function (k) {
                        sendData += k + "=" + String(map[k]).trim() + "\n";
                    });
                    sendData += "..END..";
                    postRequest("/admin/setprops", sendData, function (resp, err) {
                        delete pendingRequests[pid];
                        if (resp.substring(0, pid.length + 1) === pid + "=") {
                            var a = eval("(" + resp.substring(pid.length + 1) + ")");
                            data[pid] = a;
                            updChildren();
                            onerror();
                            onDbChanged.fire(db);
                            return;
                        }
                        if (!err) { err = resp; }
                        if (!err) { err = "Error"; }
                        onerror(err);
                    });
                },
                writeFile: function (fn, fdata, enc, onerror) {
                    if (!data[pid]) {
                        onerror("Page does not exist");
                        return;
                    }
                    if ((enc !== "text") && (enc !== "binary") &&
                            (enc !== "base64")) {
                        onerror("Invalid encoding");
                        return;
                    }
                    fdata = String(fdata);
                    if (!fdata) {
                        fdata = "";
                        enc = "empty";
                    }
                    if (pendingRequests[pid]) {
                        onerror("Request already pending");
                        return;
                    }
                    pendingRequests[pid] = 1;
                    fn = pid + "/" + fn;
                    var sendData = fn + "=" + enc + ":" + fdata;
                    if (enc === "binary") {
                        sendData = strToUint8Array(sendData);
                    }
                    postRequest("/admin/setfile", sendData, function (resp, err) {
                        delete pendingRequests[pid];
                        if (resp.substring(0, pid.length + 1) === pid + "=") {
                            var a = eval("(" + resp.substring(pid.length + 1) + ")");
                            data[pid] = a;
                            fileCache[fn] = fdata;
                            updChildren();
                            onerror();
                            onDbChanged.fire(db);
                            return;
                        }
                        if (!err) { err = resp; }
                        if (!err) { err = "Error"; }
                        onerror(err);
                    });
                },
                remove: function (onerror) {
                    if (!data[pid]) {
                        onerror("Page does not exist");
                        return;
                    }
                    if (pendingRequests[pid]) {
                        onerror("Request already pending");
                        return;
                    }
                    pendingRequests[pid] = 1;
                    postRequest("/admin/del", pid, function (resp, err) {
                        delete pendingRequests[pid];
                        if (resp === pid + "=REMOVED") {
                            delete data[pid];
                            fileCache = {};
                            updChildren();
                            onerror();
                            onDbChanged.fire(db);
                            return;
                        }
                        if (!err) { err = resp; }
                        if (!err) { err = "Error"; }
                        onerror(err);
                    });
                }
            };
        }
        db = {
            page: wrappage,
            forEachPage: function (f) {
                var arr = [], id;
                for (id in data) {
                    if (data.hasOwnProperty(id)) {
                        arr.push(id);
                    }
                }
                arr.sort();
                arr.forEach(function (id) {
                    f(wrappage(id));
                });
            },
            create: function (pid, map, onerror) {
                pid = sanitize_id(pid);
                if (pid.length < 1) {
                    onerror("Invalid id");
                    return;
                }
                if (data[pid]) {
                    onerror("Page already exists");
                    return;
                }
                if ((!map.parent) || (!data[map.parent])) {
                    onerror("Invalid parent id");
                    return;
                }
                if (pendingRequests[map.parent] || pendingRequests[pid]) {
                    onerror("Request already pending");
                    return;
                }
                wrappage(pid, "skipcheck").writeProps(map, onerror);
            }
        };
        return db;
    }

    function windowSaveBtn(title, action) {
        var line = div(), status = div(), subm;
        line.style.marginTop = "10px";
        subm = input_submit(title, function (reactivate) {
            status.textContent = "Working...";
            status.style.color = "#555";
            action(function (err) {
                reactivate();
                if (err) {
                    status.textContent = "Error: " + err;
                    status.style.color = "#f00";
                } else {
                    status.textContent = "";
                }
            });
        });
        subm.style.display = "inline-block";
        line.appendChild(subm);
        status = div();
        status.style.display = "inline-block";
        status.style.overflow = "hidden";
        status.style.marginLeft = "20px";
        line.appendChild(status);
        return line;
    }

    function isDelOptionEnabled(pid) {
        var p = db.page(pid), empty = true;
        if (!p) { return false; }
        if (pid === "index") { return false; }
        p.forEachChild(function () { empty = false; });
        p.forEachFile(function () { empty = false; });
        return empty;
    }

    function showPageDel(pid) {
        var e = div("Are you sure you want to delete the page '" + pid + "'?");
        if (!isDelOptionEnabled(pid)) { return; }
        makeWindow(e, "Delete: " + pid);
        e.appendChild(windowSaveBtn("Delete", function (showerror) {
            var p = db.page(pid);
            if (!p) {
                e.close_window();
                return;
            }
            p.remove(function (err) {
                if (err) {
                    showerror(err);
                } else {
                    e.close_window();
                }
            });
        }));
        function dbChanged() {
            if (!isDelOptionEnabled(pid)) {
                e.close_window();
            }
        }
        onDbChanged.add(dbChanged);
        e.onclose = function () {
            onDbChanged.remove(dbChanged);
        };
        dbChanged();
    }

    function showPageIcon(pid) {
        var e = div(), canvas, inp = input_text(), draw,
            icon_w = 145, icon_h = 110, empty = true;
        canvas = document.createElement("canvas");
        draw = canvas.getContext('2d');
        makeWindow(e, "Icon: " + pid);
        inp.type = "file";
        inp.style.width = "250px";
        inp.style.padding = "0";
        inp.style.border = "0";
        inp.style.background = "transparent";
        inp.style.marginBottom = "10px";
        e.appendChild(div(inp));
        canvas.style.border = "1px solid black";
        canvas.width = icon_w;
        canvas.height = icon_h;
        e.appendChild(div(canvas));
        draw.fillText("no icon", 10, 10);
        function setImg(img) {
            var crop_w = img.width,
                crop_h = img.height;
            if ((crop_w < 5) || (crop_h < 5)) { return; }
            if (crop_w / crop_h > icon_w / icon_h) {
                crop_w = crop_h * (icon_w / icon_h);
            } else if (crop_h / crop_w > icon_h / icon_w) {
                crop_h = crop_w * (icon_h / icon_w);
            }
            draw.drawImage(
                img,
                (img.width - crop_w) / 2,
                (img.height - crop_h) / 2,
                crop_w,
                crop_h,
                0,
                0,
                icon_w,
                icon_h
            );
            empty = false;
        }
        inp.onchange = function () {
            function onld(ev) {
                try {
                    var img = document.createElement("img");
                    img.onload = function () {
                        try {
                            setImg(img);
                        } catch (err) {
                            error(err);
                        }
                    };
                    img.src = ev.target.result;
                } catch (err) {
                    error(err);
                }
            }
            try {
                if (inp.files.length < 1) { return; }
                var fr = new FileReader();
                fr.onload = onld;
                fr.readAsDataURL(inp.files[0]);
            } catch (err) {
                error(err);
            }
        };
        e.appendChild(windowSaveBtn("Change", function (showerror) {
            var p = db.page(pid), data;
            if (!p) {
                e.close_window();
                return;
            }
            if (empty) {
                data = "";
            } else {
                data = canvas.toDataURL("image/jpeg");
                if (data.substring(0, 23) !== "data:image/jpeg;base64,") {
                    showerror("Could not encode JPEG image");
                    return;
                }
                data = data.substring(23);
            }
            p.writeFile("icon.jpg", data, "base64", function (err) {
                if (err) {
                    showerror(err);
                } else {
                    e.close_window();
                }
            });
        }));
        function dbChanged() {
            if (!db.page(pid)) {
                e.close_window();
            }
        }
        onDbChanged.add(dbChanged);
        e.onclose = function () {
            onDbChanged.remove(dbChanged);
        };
        dbChanged();
    }

    function textEditor_insertImage_onFile(append_html, pid, inp, onerror) {
        if (inp.files.length < 1) { return; }
        var fr, fname, fext = "", maxsize = 1024 * 1024;
        try {
            fr = new FileReader();
        } catch (err) {
            onerror("Your browser does not support the FileReader interface");
            return;
        }
        fname = String(inp.files[0].name).toLowerCase();
        if (fname.match(/\.(jpg|jpeg)$/)) {
            fext = "jpg";
        }
        if (fname.match(/\.png$/)) {
            fext = "png";
        }
        if (fext.length < 1) {
            onerror("Only JPG and PNG files are supported");
            return;
        }
        if (inp.files[0].size > maxsize) {
            onerror("File is too large");
            return;
        }
        fr.onload = function (ev) {
            var fn, n = 1, p, data = String(ev.target.result);
            if (data.length < 1) { return; }
            if (data.length > maxsize) {
                onerror("File is too large");
                return;
            }
            p = db.page(pid);
            if (!p) {
                onerror("Page not found");
                return;
            }
            fn = "img_" + n + "." + fext;
            while (p.hasFile(fn)) {
                n = n + 1;
                fn = "img_" + n + "." + fext;
            }
            p.writeFile(fn, data, "binary", function (err) {
                onerror(err);
                if (err) { return; }
                append_html('<p><img src="/' + fn + '" /></p>');
            });
        };
        fr.readAsBinaryString(inp.files[0]);
    }

    function textEditor_insertImage(append_html, pid) {
        var popup = div(), inp = input_text(), msg = div();
        popup.appendChild(inp);
        popup.appendChild(msg);
        inp.type = "file";
        inp.style.width = "250px";
        inp.style.padding = "0";
        inp.style.border = "0";
        inp.style.background = "transparent";
        inp.onchange = function () {
            textEditor_insertImage_onFile(append_html, pid, inp, function (err) {
                if (err) {
                    msg.textContent = "Error: " + err;
                    msg.style.marginTop = "10px";
                    msg.style.color = "#f00";
                } else {
                    popup.close_window();
                }
            });
        };
        return popup;
    }

    function textEditor_insertLinkToPage(append_html) {
        var popup = div(), select = document.createElement("select");
        popup.appendChild(select);
        select.style.width = "250px";
        function addopt(val) {
            var opt = document.createElement("option");
            opt.value = val;
            opt.text = val;
            select.appendChild(opt);
        }
        addopt("");
        db.forEachPage(function (p) {
            p.forEachProp(function (pname) {
                if (pname.substring(0, 6) === "title_") {
                    pname = pname.substring(6);
                    addopt("/" + p.id() + "/" + pname);
                }
            });
        });
        popup.appendChild(windowSaveBtn("Add", function (showerror) {
            var l = select.value;
            if (l.charAt(0) !== "/") {
                showerror("Choose an option");
                return;
            }
            append_html('<p><a href="' + l + '">' + l + '</a></p>');
            popup.close_window();
        }));
        return popup;
    }

    function textEditor_insertLinkToURL(append_html) {
        var popup = div(), inp, btn;
        btn = windowSaveBtn("Add", function (showerror) {
            var l = inp.value;
            if ((l.substring(0, 7) !== "http://") &&
                    (l.substring(0, 8) !== "https://")) {
                showerror("Invalid link");
                return;
            }
            append_html('<p><a href="' + l + '">' + l + '</a></p>');
            popup.close_window();
        });
        inp = input_text(btn.getElementsByTagName("input")[0].onclick);
        inp.value = "http://";
        inp.style.width = "250px";
        popup.appendChild(inp);
        popup.appendChild(btn);
        return popup;
    }

    function textEditor_buttons(append_html, pid, openPopupWindow) {
        function btn(text, cmd, par) {
            var l = link(text, function () {
                try {
                    if ((cmd !== "formatBlock") && (cmd !== "removeFormat")) {
                        document.execCommand("removeFormat", false, false);
                    }
                    document.execCommand(cmd, false, par);
                } catch (ignore) {}
            });
            l.onmousedown = function (ev) {
                if (ev) { ev.preventDefault(); }
                return false;
            };
            return l;
        }
        var panel = div(), line = div();
        line.appendChild(span("Paragraph: "));
        line.appendChild(btn(" regular ", "formatBlock", "p"));
        line.appendChild(span(" | "));
        line.appendChild(btn(" code ", "formatBlock", "pre"));
        line.appendChild(span(" | "));
        line.appendChild(btn(" header ", "formatBlock", "h1"));
        line.appendChild(span(" | "));
        line.appendChild(btn(" subheader ", "formatBlock", "h2"));
        line.style.marginBottom = "10px";
        panel.appendChild(line);
        line = div();
        line.appendChild(span("Text style: "));
        line.appendChild(btn(" regular ", "removeFormat", false));
        line.appendChild(span(" | "));
        line.appendChild(btn(" bold ", "bold", false));
        line.appendChild(span(" | "));
        line.appendChild(btn(" italic ", "italic", false));
        line.appendChild(span(" | "));
        line.appendChild(btn(" superscript ", "superscript", false));
        line.style.marginBottom = "10px";
        panel.appendChild(line);
        line = div();
        line.appendChild(span("Insert: "));
        line.appendChild(link(" image ", function () {
            openPopupWindow(
                "Insert image",
                textEditor_insertImage(append_html, pid)
            );
        }));
        line.appendChild(span(" | "));
        line.appendChild(link(" link to page ", function () {
            openPopupWindow(
                "Insert link to page",
                textEditor_insertLinkToPage(append_html)
            );
        }));
        line.appendChild(span(" | "));
        line.appendChild(link(" link to url ", function () {
            openPopupWindow(
                "Insert link to URL",
                textEditor_insertLinkToURL(append_html)
            );
        }));
        line.style.marginBottom = "10px";
        panel.appendChild(line);
        return panel;
    }

    function showEditContent_dataLoaded(pid, lang, e, initContent) {
        var editable = div(), openPopupWindow;
        (function () {
            var popups = makeSet();
            openPopupWindow = function (title, content) {
                makeWindow(content, title);
                popups.add(content);
                content.onclose = function () {
                    popups.remove(content);
                };
            };
            e.onclose = function () {
                popups.forEach(function (p) { p.close_window(); });
            };
        }());
        function getCleanHtml(append) {
            var h = editable.innerHTML, imgs, i;
            if (append) {
                h += append;
            }
            h = cleanHtml(h, "/file/" + pid + "/");
            editable.innerHTML = (h.length > 0) ? h : "<p></p>";
            imgs = editable.getElementsByTagName("img");
            for (i = 0; i < imgs.length; i = i + 1) {
                imgs[i].contentEditable = false;
                imgs[i].style.minWidth = "20px";
                imgs[i].style.minHeight = "20px";
                imgs[i].style.maxWidth = "40px";
                imgs[i].style.maxHeight = "40px";
                imgs[i].style.margin = "2px";
                imgs[i].style.verticalAlign = "middle";
                imgs[i].style.border = "1px solid black";
            }
            return h;
        }
        e.appendChild(textEditor_buttons(getCleanHtml, pid, openPopupWindow));
        e.appendChild(editable);
        editable.style.overflowX = "hidden";
        editable.style.overflowY = "scroll";
        editable.style.border = "1px solid black";
        editable.style.padding = "5px";
        editable.style.background = "#fff";
        editable.style.minWidth = "300px";
        editable.style.minHeight = "100px";
        editable.style.width = "400px";
        editable.style.height = "300px";
        editable.style.resize = "both";
        editable.contentEditable = true;
        getCleanHtml(initContent);
        e.appendChild(windowSaveBtn("Save", function (showerror) {
            var p = db.page(pid), data = getCleanHtml();
            if (!p) {
                showerror("Page does not exist");
                return;
            }
            p.writeFile(lang + ".html", data, "text", function (err) {
                if (err) {
                    showerror(err);
                } else {
                    e.close_window();
                }
            });
        }));
    }

    function showEditContent(pid, lang) {
        var e = div("Loading... "), p = db.page(pid);
        if (!p) {
            return;
        }
        makeWindow(e, "Edit Content: " + pid + " / " + lang);
        if (!p.hasFile(lang + ".html")) {
            e.textContent = "";
            showEditContent_dataLoaded(pid, lang, e, "");
            return;
        }
        p.onFileData(lang + ".html", function (data, err) {
            if (err) {
                e.textContent = "Error: " + err;
                return;
            }
            e.textContent = "";
            showEditContent_dataLoaded(pid, lang, e, data);
        });
    }

    function showPageMove(pid) {
        var e = div(), panel = div(), select;
        makeWindow(e, "Move: " + pid);
        e.appendChild(panel);
        function isGoodParent(parent) {
            var i;
            if (!parent) { return false; }
            for (i = 0; i < 10; i += 1) {
                if (parent.id() === pid) { return false; }
                parent = parent.parent();
                if (!parent) { break; }
            }
            if (!parent) { return true; }
            return false;
        }
        e.appendChild(windowSaveBtn("Move", function (showerror) {
            var p = db.page(pid), parent = String(select.value);
            if (!p) { e.close_window(); return; }
            if (parent && (!isGoodParent(db.page(parent)))) {
                showerror("Invalid choice");
                return;
            }
            p.writeProps({"parent": parent}, function (err) {
                if (err) {
                    showerror(err);
                } else {
                    e.close_window();
                }
            });
        }));
        function dbChanged() {
            var p, option, curparent;
            p = db.page(pid);
            if (!p) { e.close_window(); return; }
            curparent = p.parent();
            if (curparent) {
                curparent = curparent.id();
            } else {
                curparent = "";
            }
            if (select) {
                panel.removeChild(select);
            }
            select = document.createElement("select");
            option = document.createElement("option");
            option.value = "";
            option.text = "<no parent>";
            option.selected = (curparent === "") ? "selected" : "";
            select.appendChild(option);
            db.forEachPage(function (parent) {
                if (isGoodParent(parent)) {
                    option = document.createElement("option");
                    option.value = parent.id();
                    option.text = parent.id();
                    option.selected = (curparent === parent.id()) ? "selected" : "";
                    select.appendChild(option);
                }
            });
            panel.appendChild(select);
            select.style.width = "300px";
        }
        onDbChanged.add(dbChanged);
        e.onclose = function () {
            onDbChanged.remove(dbChanged);
        };
        dbChanged();
    }

    function pagePropertiesPanel(pid, parentid) {
        var e = div(),
            btn,
            autoid = "",
            btntit = "Save Changes",
            inputs = {},
            input_ids = ["title_en", "title_pl"],
            fieldTitles = {
                "title_en": "Title (EN)",
                "title_pl": "Title (PL)",
                "id": "Page Address"
            };
        function cap(text) {
            var d = div(text);
            d.style.width = "120px";
            d.style.display = "inline-block";
            d.style.overflow = "hidden";
            d.style.marginRight = "20px";
            return d;
        }
        function propEdit(propid, onsubmit) {
            var d = div(), inp;
            d.appendChild(cap(fieldTitles[propid] + ":"));
            d.style.marginBottom = "10px";
            inp = input_text(onsubmit);
            (function () {
                if (!pid) { return; }
                var p = db.page(pid);
                if (p) {
                    inp.value = p.prop(propid);
                }
            }());
            inp.style.width = "260px";
            inp.style.display = "inline-block";
            d.appendChild(inp);
            e.appendChild(d);
            function makeAutoid(s) {
                s = String(s).toLowerCase();
                s = s.replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
                s = s.replace(/^_+/, "").replace(/_+$/, "");
                s = sanitize_id(s);
                if (!s) { return s; }
                if (!db.page(s)) { return s; }
                var n = 2;
                while (db.page(s + "_" + n)) {
                    n += 1;
                }
                return s + "_" + n;
            }
            inp.onchange = inp.onkeyup = function () {
                e.propsChanged = true;
                btn.style.display = "block";
                if (propid === "id") {
                    if (String(inp.value).length >= 1) {
                        autoid = "id";
                        inp.onchange = function () {
                            var s = sanitize_id(inp.value);
                            if (s !== String(inp.value)) {
                                inp.value = s;
                            }
                        };
                    }
                } else if ((autoid === "") || (autoid === propid)) {
                    autoid = propid;
                    if (inputs.id) {
                        inputs.id.value = makeAutoid(inp.value);
                        if (!inputs.id.value) { autoid = ""; }
                    }
                }
            };
            inputs[propid] = inp;
        }
        if (parentid) {
            btntit = "Create";
            input_ids.push("id");
        }
        btn = windowSaveBtn(btntit, function (showerror) {
            var p, data = {}, anytitle = false;
            Object.keys(inputs).forEach(function (id) {
                data[id] = String(inputs[id].value).trim();
                if ((id.substring(0, 6) === "title_") && data[id]) {
                    anytitle = true;
                }
            });
            if (!anytitle) {
                showerror("Titles cannot all be empty");
                return;
            }
            function onerr(err) {
                if (err) {
                    showerror(err);
                } else {
                    showerror();
                    btn.style.display = "none";
                    e.propsChanged = undefined;
                    if (e.close_window) {
                        e.close_window();
                    }
                }
            }
            if (!pid) {
                p = data.id;
                delete data.id;
                data.parent = parentid;
                db.create(p, data, onerr);
                return;
            }
            p = db.page(pid);
            if (!p) {
                showerror("Page not found");
                return;
            }
            p.forEachFile(function (fn) {
                fn = fn.split(".");
                if (fn.length !== 2) { return; }
                if (fn[1] !== "html") { return; }
                if (!data["title_" + fn[0]]) {
                    showerror("Title (" + fn[0].toUpperCase() +
                        ") cannot be empty");
                    p = undefined;
                }
            });
            if (p) {
                p.writeProps(data, onerr);
            }
        });
        btn.style.display = "none";
        input_ids.forEach(function (id) {
            propEdit(id,  btn.getElementsByTagName("input")[0].onclick);
        });
        e.appendChild(btn);
        return e;
    }

    function showPageEdit(pid) {
        var e = div(), bottom = div(), links = div(), panel;
        makeWindow(e, "Edit: " + pid);
        e.appendChild(links);
        e.appendChild(bottom);
        panel = pagePropertiesPanel(pid);
        bottom.appendChild(panel);
        function dbChanged() {
            var p = db.page(pid);
            if (!p) {
                e.close_window();
                return;
            }
            if (!panel.propsChanged) {
                bottom.textContent = "";
                panel = pagePropertiesPanel(pid);
                bottom.appendChild(panel);
            }
            links.textContent = "";
            links.style.marginBottom = "10px";
            links.appendChild(link(
                "set icon",
                function () { showPageIcon(pid); }
            ));
            p.forEachProp(function (k) {
                if (k.substring(0, 6) !== "title_") { return; }
                k = k.substring(6);
                links.appendChild(span(" |"));
                links.appendChild(link(
                    " edit " + k,
                    function () { showEditContent(pid, k); }
                ));
            });
            if (pid !== "index") {
                links.appendChild(span(" |"));
                links.appendChild(link(
                    " move",
                    function () { showPageMove(pid); }
                ));
            }
            links.appendChild(span(" |"));
            links.appendChild(link(
                " new page",
                function () {
                    makeWindow(
                        pagePropertiesPanel(undefined, pid),
                        "New Page (in: " + pid + ")"
                    );
                }
            ));
            if (isDelOptionEnabled(pid)) {
                links.appendChild(span(" | "));
                links.appendChild(link(
                    " delete",
                    function () { showPageDel(pid); }
                ));
            }
        }
        onDbChanged.add(dbChanged);
        e.onclose = function () {
            onDbChanged.remove(dbChanged);
        };
        dbChanged();
    }

    function openPageList() {
        var list = div(),
            e = div();
        makeWindow(e, "Page List", true);
        e.appendChild(list);
        e.style.minWidth = "200px";
        e.style.minHeight = "100px";
        e.style.width = "300px";
        e.style.height = "150px";
        e.style.overflow = "scroll";
        e.style.resize = "both";
        e.style.background = "#fff";
        function dbChanged() {
            var parent, lines = {};
            list.textContent = "";
            db.forEachPage(function (p) {
                var line = div(p.id());
                line.style.marginBottom = "10px";
                p.forEachProp(function (k) {
                    if (k.substring(0, 6) !== "title_") { return; }
                    k = k.substring(6);
                    line.appendChild(link(
                        " " + k,
                        function () {
                            onPageChanged.fire(p.id() + "/" + k);
                        }
                    ));
                });
                line.appendChild(link(
                    " [edit]",
                    function () { showPageEdit(p.id()); }
                ));
                lines[p.id()] = line;
            });
            Object.keys(lines).forEach(function (l) {
                parent = db.page(l).parent();
                if (parent) {
                    lines[parent.id()].appendChild(lines[l]);
                    lines[l].style.marginLeft = "30px";
                } else {
                    list.appendChild(lines[l]);
                }
            });
        }
        onDbChanged.add(dbChanged);
        e.onclose = function () {
            onDbChanged.remove(dbChanged);
        };
        dbChanged();
    }

    function init() {
        var w = div("Loading database...");
        makeWindow(w, "Administration", true);
        postRequest(
            "/admin/getdb",
            "getdb;" + String(new Date().getTime()),
            function (d) {
                if ((d.length < 1) || (d[0] !== "{")) {
                    w.textContent = "Could not load database!";
                    return;
                }
                d = eval("(" + d + ")");
                if (!d) {
                    w.textContent = "Invalid database data!";
                    return;
                }
                db = makeDbWrapper(d);
                onDbChanged.fire(db);
                openPageList();
                w.close_window();
            }
        );
    }

    try {
        init();
    } catch (err) {
        error(err);
    }
}());
