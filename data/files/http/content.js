
(function () {
    "use strict";

    var loggedUser, error = showError;

    function $(id) {
        return document.getElementById(id);
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

    function para(content) {
        var e = document.createElement("p");
        if (content) {
            if (typeof content === "object") {
                e.appendChild(content);
            } else {
                e.textContent = String(content);
            }
        }
        return e;
    }

    function span(text) {
        var e = document.createElement("span");
        if (text) { e.textContent = text; }
        return e;
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

    function clickable(e, action) {
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

    function animateHeightUnfold(e) {
        var h = 1;
        e.style.overflow = "hidden";
        e.style.maxHeight = h + "px";
        function step() {
            h = (h + 2) * 1.5;
            if (h > 2000) {
                e.style.maxHeight = undefined;
            } else {
                setTimeout(step, 25);
                e.style.maxHeight = Math.round(h) + "px";
            }
        }
        setTimeout(step, 25);
    }

    function animateFadeRemove(e) {
        var opacity = 1;
        function step() {
            opacity -= 0.03;
            if (opacity <= 0.05) {
                e.parentNode.removeChild(e);
            } else {
                setTimeout(step, 25);
                e.style.opacity = opacity;
            }
        }
        setTimeout(step, 25);
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

    function postRequest(url, data, onresponse) {
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
    }

    function initTreeMenu() {
        var db, lang, pid, pidChanged;
        function buildMenu() {
            var selected, visited = {}, linkById = {}, subsById = {};
            function orderFunc(c) {
                return c.prop("title_" + lang);
            }
            pidChanged = function () {
                var p, i;
                if (selected) {
                    selected.style.fontWeight = "normal";
                    selected = undefined;
                }
                if (linkById[pid]) {
                    linkById[pid].style.fontWeight = "bold";
                    selected = linkById[pid];
                    p = db.page(pid);
                    for (i = 0; i < 100; i += 1) {
                        if (!subsById[p.id()]) { break; }
                        if (String(subsById[p.id()].style.display) === "none") {
                            animateHeightUnfold(subsById[p.id()]);
                        }
                        subsById[p.id()].style.display = "block";
                        p = p.parent();
                        if ((!p) || (p.id() === "index")) { break; }
                    }
                }
            };
            function visit(p) {
                var outer, e, subs;
                if (!p) { return; }
                if (visited[p.id()]) { return; }
                visited[p.id()] = 1;
                if (!p.prop("title_" + lang)) { return; }
                subs = div();
                p.forEachChild(function (c) {
                    var c_elem = visit(c);
                    if (c_elem) {
                        c_elem.style.marginLeft = "20px";
                        subs.appendChild(c_elem);
                    }
                }, orderFunc);
                e = div(p.prop("title_" + lang));
                subs.style.display = "none";
                clickable(e, function () {
                    if (selected === e) {
                        if (String(subs.style.display) !== "none") {
                            subs.style.display = "none";
                        } else {
                            if (subs.style.display === "none") {
                                animateHeightUnfold(subs);
                            }
                            subs.style.display = "block";
                        }
                    } else {
                        onPageChanged.fire(p.id() + "/" + lang);
                    }
                });
                outer = div();
                outer.appendChild(e);
                outer.appendChild(subs);
                linkById[p.id()] = e;
                subsById[p.id()] = subs;
                return outer;
            }
            return (function () {
                var container = div();
                db.page("index").forEachChild(function (c) {
                    var c_elem = visit(c);
                    if (c_elem) {
                        container.appendChild(c_elem);
                    }
                }, orderFunc);
                return container;
            }());
        }
        onDbChanged.add(function (newDb) {
            db = newDb;
            if (db && lang) {
                $("treemenu").textContent = "";
                $("treemenu").appendChild(buildMenu());
                if (pidChanged) { pidChanged(); }
            }
        });
        onPageChanged.add(function (newPath) {
            var path = newPath.split("/");
            if (path.length !== 2) {
                pid = "";
                if (pidChanged) { pidChanged(); }
                return;
            }
            if (lang !== path[1]) {
                pid = path[0];
                lang = path[1];
                if (db && lang) {
                    $("treemenu").textContent = "";
                    $("treemenu").appendChild(buildMenu());
                    if (pidChanged) { pidChanged(); }
                }
            } else if (pid !== path[0]) {
                pid = path[0];
                if (pidChanged) { pidChanged(); }
            }
        });
    }

    function upgradeLink(db, a) {
        function markInvalid(a) {
            a.style.background = "#f00";
            a.onclick = function (ev) {
                if (ev) { ev.preventDefault(); }
                return false;
            };
        }
        var linkedpage, href = String(a.getAttribute("href"));
        if (href.charAt(0) !== "/") {
            a.target = "_blank";
            return;
        }
        href = href.substring(1).split("/");
        if (href.length !== 2) { markInvalid(a);  return; }
        linkedpage = db.page(href[0]);
        if (!linkedpage) { markInvalid(a);  return; }
        if (linkedpage.prop("title_" + href[1]).length < 1) {
            markInvalid(a);
            return;
        }
        a.onclick = function (ev) {
            onPageChanged.fire(href[0] + "/" + href[1]);
            if (ev) { ev.preventDefault(); }
            return false;
        };
    }

    function addContentLoginForm() {
        var user, pass, submit;
        $("title").textContent = "Login";
        if (loggedUser) {
            $("article").appendChild(
                para("You are now logged in as '" + loggedUser + "'.")
            );
            return;
        }
        function btnlabel(b, label) {
            var p = para(label + ":");
            p.appendChild(document.createElement("br"));
            p.appendChild(b);
            return p;
        }
        function loginFailedMsg(msg) {
            var e = div(msg || "Login failed");
            e.className = "jswarning";
            $("leftcolumn").appendChild(e);
            setTimeout(function () {
                animateFadeRemove(e);
            }, 3000);
        }
        submit = input_submit("Login", function (reactivate) {
            var u = user.value, p = pass.value;
            postRequest(
                "/login",
                u + ":" + p,
                function (d, err) {
                    if ((d !== "OK") && (d !== "ADMIN")) {
                        loginFailedMsg(err);
                        reactivate();
                        user.value = "";
                        pass.value = "";
                        return;
                    }
                    loggedUser = u;
                    $("article").textContent = "";
                    $("article").appendChild(
                        para("You are now logged in as '" + u + "'.")
                    );
                    if (d === "ADMIN") {
                        var e = document.createElement("script");
                        e.src = "/file/admin.js";
                        document.body.appendChild(e);
                    }
                }
            );
        });
        user = input_text(submit.onclick);
        user.style.width = "40%";
        pass = input_text(submit.onclick);
        pass.type = "password";
        pass.style.width = "40%";
        $("article").appendChild(btnlabel(user, "User"));
        $("article").appendChild(btnlabel(pass, "Password"));
        $("article").appendChild(para(submit));
    }

    function addContentPage(db, pid, lang) {
        var p = db.page(pid),
            tit = p.prop("title_" + lang),
            children = [],
            visitedSubs = {};
        if (!tit) { return; }
        $("title").textContent = tit;
        function fixLinks(elem) {
            var i, links = elem.getElementsByTagName("a");
            for (i = 0; i < links.length; i += 1) {
                upgradeLink(db, links[i]);
            }
        }
        if (p.hasFile(lang + ".html")) {
            $("article").appendChild(para("Loading..."));
            p.onFileData(lang + ".html", function (r, err) {
                if (err || (!r)) {
                    $("article").textContent = "";
                    $("article").appendChild(para("Loading failed!"));
                    return;
                }
                $("article").innerHTML = r;
                fixLinks($("article"));
            });
        }
        function addChild(c) {
            if (visitedSubs[c.id()]) { return; }
            visitedSubs[c.id()] = true;
            children.push(c);
        }
        p.forEachChild(addChild);
        if (p.prop("type") === "tag") {
            db.forEachPage(function (c) {
                if (c.prop("type") === "tag") { return; }
                c.prop("tags").split(",").forEach(function (t) {
                    if (t === pid) {
                        addChild(c);
                    }
                });
            });
        }
        children = sortByFunc(children, function (c) {
            return c.prop("title_" + lang);
        });
        children.forEach(function (c) {
            var id = c.id(), ctit = c.prop("title_" + lang), li, a, img;
            if (ctit.length < 1) { return; }
            li = document.createElement("li");
            a = document.createElement("a");
            a.href = "/" + id + "/" + lang;
            li.appendChild(a);
            a.onclick = function (ev) {
                onPageChanged.fire(id + "/" + lang);
                if (ev) { ev.preventDefault(); }
                return false;
            };
            if (c.hasFile("icon.jpg")) {
                img = document.createElement("img");
                img.src = "/file/" + id + "/icon.jpg";
                a.appendChild(img);
            }
            a.appendChild(span(ctit));
            $("subs").appendChild(li);
        });
    }

    function addContent(db, path) {
        if (!db) { return; }
        if (!path) { return; }
        $("title").style.display = (path.substring(0, 6) === "index/") ?
                "none" : "block";
        $("title").textContent = "";
        $("article").textContent = "";
        $("subs").textContent = "";
        if (path === "[login]") {
            addContentLoginForm();
        } else {
            path = path.split("/");
            if (path.length !== 2) { return; }
            var p = db.page(path[0]);
            if (!p) { return; }
            addContentPage(db, path[0], path[1]);
            document.body.className = "lang_" + path[1];
        }
        window.document.title = $("title").textContent;
    }

    function initContent() {
        var db, path = "", last_lang = "";
        onDbChanged.add(function (newDb) {
            db = newDb;
            addContent(db, path);
        });
        onPageChanged.add(function (newPath) {
            if (path === newPath) { return; }
            path = newPath;
            addContent(db, path);
            newPath = newPath.split("/");
            if (newPath.length === 2) {
                last_lang = newPath[1];
            }
        });
        $("title").style.display = "none";
        $("article").textContent = "";
        $("subs").textContent = "";
        $("article").appendChild(para("Loading..."));
        $("footer").appendChild(
            clickable(span("login"), function () {
                onPageChanged.fire("[login]");
            })
        );
        function upgradeLangLink(e) {
            var newlang = String(e.href).split("/"), active = true;
            newlang = newlang[newlang.length - 1];
            onPageChanged.add(function (newPath) {
                var p = newPath.split("/");
                if (p.length !== 2) { return; }
                if (newlang === p[1]) {
                    active = false;
                    e.style.cursor = "default";
                    e.style.opacity = 0.3;
                } else {
                    active = true;
                    e.style.cursor = "pointer";
                    e.style.opacity = 1;
                }
            });
            e.onclick = function (ev) {
                try {
                    var p, curpid;
                    if (active && db && (path.length > 0)) {
                        curpid = path.split("/");
                        if (curpid.length === 2) {
                            curpid = curpid[0];
                        } else {
                            curpid = "index";
                        }
                        p = db.page(curpid);
                        if (p && (p.prop("title_" + newlang).length >= 1)) {
                            onPageChanged.fire(curpid + "/" + newlang);
                        } else {
                            onPageChanged.fire("index/" + newlang);
                        }
                    }
                } catch (err) {
                    error(err);
                }
                if (ev) { ev.preventDefault(); }
                return false;
            };
        }
        function upgradeStaticLink(a) {
            var href = String(a.getAttribute("href"));
            if (href.charAt(0) !== "/") {
                a.target = "_blank";
                return;
            }
            href = href.substring(1).split("/");
            a.onclick = function (ev) {
                if (last_lang.length > 0) {
                    onPageChanged.fire(href[0] + "/" + last_lang);
                }
                if (ev) { ev.preventDefault(); }
                return false;
            };
        }
        (function () {
            var i, as;
            as = $("langs").getElementsByTagName("a");
            for (i = 0; i < as.length; i += 1) {
                upgradeLangLink(as[i]);
            }
            as = document.body.getElementsByTagName("a");
            for (i = 0; i < as.length; i += 1) {
                if (as[i].onclick) { return; }
                upgradeStaticLink(as[i]);
            }
        }());
    }

    try {
        initContent();
        initTreeMenu();
    } catch (err) {
        error(err);
    }
}());
