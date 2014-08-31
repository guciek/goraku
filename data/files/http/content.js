
(function () {
    "use strict";

    var loggedUser, error = showError;

    function $(id) {
        return document.getElementById(id);
    }

    function div(text) {
        var e = document.createElement("div");
        if (text) { e.textContent = text; }
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

    function input(action) {
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
                return false;
            };
        }
        return e;
    }

    function btn(e, action) {
        if (typeof e !== "object") {
            var tit = String(e);
            e = document.createElement("input");
            e.type = "submit";
            e.value = tit;
        }
        e.onclick = function () {
            try {
                action();
            } catch (err) {
                error(err);
            }
        };
        e.style.cursor = "pointer";
        return e;
    }

    function elementChildNodes(e) {
        var i, nodes, array = [];
        if (!e) { return; }
        nodes = e.childNodes;
        if (!nodes) { return; }
        for (i = 0; i < nodes.length; i += 1) {
            if (nodes[i].nodeType === 1) { array.push(nodes[i]); }
        }
        return array;
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
                btn(e, function () {
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

    function addContentLoginForm() {
        var user, pass, submit, submitActive = true;
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
        function loginFailedMsg() {
            var e = div("Login failed");
            e.className = "jswarning";
            $("leftcolumn").appendChild(e);
            setTimeout(function () {
                animateFadeRemove(e);
            }, 3000);
        }
        function onsubmit() {
            if (!submitActive) { return; }
            submitActive = false;
            submit.disabled = !submitActive;
            var u = user.value, p = pass.value;
            postRequest(
                "/login",
                u + ":" + p,
                function (d) {
                    if ((d !== "OK") && (d !== "ADMIN")) {
                        loginFailedMsg();
                        submitActive = true;
                        submit.disabled = !submitActive;
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
        }
        user = input(onsubmit);
        user.style.width = "40%";
        pass = input(onsubmit);
        pass.type = "password";
        pass.style.width = "40%";
        submit = btn("Login", onsubmit);
        $("article").appendChild(btnlabel(user, "User"));
        $("article").appendChild(btnlabel(pass, "Password"));
        $("article").appendChild(para(submit));
    }

    function addContentPage(db, p, lang) {
        var tit = p.prop("title_" + lang);
        if (!tit) { return; }
        function fixLink(a) {
            function markInvalid(a) {
                a.style.background = "#f00";
            }
            var linkedpage, href = String(a.getAttribute("href"));
            if ((href.substring(0, 7) === "http://") ||
                    (href.substring(0, 8) === "https://")) {
                a.target = "_blank";
                return;
            }
            a.href = "#";
            if (href.charAt(0) !== "/") { markInvalid(a);  return; }
            href = href.substring(1).split("/");
            if (href.length !== 2) { markInvalid(a);  return; }
            linkedpage = db.page(href[0]);
            if (!linkedpage) { markInvalid(a);  return; }
            if (linkedpage.prop("title_" + href[1]).length < 1) {
                markInvalid(a);
                return;
            }
            a.onclick = function () {
                onPageChanged.fire(href[0] + "/" + href[1]);
                return false;
            };
        }
        function fixLinks(elem) {
            var i, links = elem.getElementsByTagName("a");
            for (i = 0; i < links.length; i += 1) {
                fixLink(links[i]);
            }
        }
        $("title").textContent = tit;
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
        p.forEachChild(function (c) {
            var id = c.id(), ctit = c.prop("title_" + lang), li, a, img;
            if (ctit.length < 1) { return; }
            li = document.createElement("li");
            a = document.createElement("a");
            a.href = "#";
            li.appendChild(a);
            a.onclick = function () {
                onPageChanged.fire(id + "/" + lang);
                return false;
            };
            if (c.hasFile("icon.jpg")) {
                img = document.createElement("img");
                img.src = "/file/" + id + "/icon.jpg";
                a.appendChild(img);
            }
            a.appendChild(span(ctit));
            $("subs").appendChild(li);
        }, function (c) { return c.prop("title_" + lang); });
    }

    function initContent() {
        var db, curPath = "";
        function update() {
            var p, path;
            $("title").textContent = "";
            $("article").textContent = "";
            $("subs").textContent = "";
            if (!db) { return; }
            if (curPath.length < 1) { return; }
            if (curPath === "login") {
                addContentLoginForm();
            } else {
                path = curPath.split("/");
                if (path.length !== 2) { return; }
                p = db.page(path[0]);
                if (!p) { return; }
                addContentPage(db, p, path[1]);
                document.body.className = "lang_" + path[1];
            }
            window.document.title = $("title").textContent;
        }
        onDbChanged.add(function (newDb) {
            db = newDb;
            update();
        });
        onPageChanged.add(function (path) {
            if (path === curPath) { return; }
            curPath = path;
            update();
        });
        $("footer").appendChild(
            btn(span("login"), function () {
                onPageChanged.fire("login");
            })
        );
        function upgradeLangLink(e) {
            var newlang = String(e.href).split("/"), active = true;
            newlang = newlang[newlang.length - 1];
            onPageChanged.add(function (newPath) {
                var path = newPath.split("/");
                if (path.length !== 2) { return; }
                if (newlang === path[1]) {
                    active = false;
                    e.style.cursor = "default";
                    e.style.opacity = 0.3;
                } else {
                    active = true;
                    e.style.cursor = "pointer";
                    e.style.opacity = 1;
                }
            });
            e.href = "#";
            e.onclick = function () {
                var p, curpid;
                if (!active) { return false; }
                curpid = curPath.split("/")[0];
                if (db) {
                    p = db.page(curpid);
                    if (p && (p.prop("title_" + newlang).length >= 1)) {
                        onPageChanged.fire(curpid + "/" + newlang);
                        return false;
                    }
                }
                onPageChanged.fire("index/" + newlang);
                return false;
            };
        }
        elementChildNodes($("langs")).forEach(upgradeLangLink);
    }

    try {
        initContent();
        initTreeMenu();
    } catch (err) {
        error(err);
    }
}());
