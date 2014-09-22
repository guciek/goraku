
(function () {
    "use strict";

    function animateHeightUnfold(e) {
        var h = 1;
        e.style.overflow = "hidden";
        e.style.maxHeight = h + "px";
        function step() {
            h = (h + 2) * 1.5;
            if (h > 1000) {
                e.style.maxHeight = "none";
            } else {
                setTimeout(step, 10);
                e.style.maxHeight = Math.round(h) + "px";
            }
        }
        setTimeout(step, 10);
    }

    function initTreeMenu() {
        var db, lang, pid, pidChanged;
        function buildMenu() {
            var selected, visited = {}, setSelById = {}, subsById = {};
            function orderFunc(c) {
                return (c.prop("sort") || "50") + c.prop("title_" + lang);
            }
            pidChanged = function () {
                var p, i;
                if (selected) {
                    selected(false);
                    selected = undefined;
                }
                if (setSelById[pid]) {
                    selected = setSelById[pid];
                    selected(true);
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
                var line = element("div"),
                    outer = element("div", line),
                    subs = element("div"),
                    tit = p.prop("title_" + lang);
                function setSelected(issel) {
                    var a;
                    line.textContent = "";
                    if (issel) {
                        a = element("span", tit);
                        a.style.fontWeight = "bold";
                        line.appendChild(a);
                        clickable(a, function () {
                            if (String(subs.style.display) !== "none") {
                                subs.style.display = "none";
                            } else {
                                if (subs.style.display === "none") {
                                    animateHeightUnfold(subs);
                                }
                                subs.style.display = "block";
                            }
                        });
                    } else {
                        a = element("a", tit);
                        a.href = "/" + p.id() + "/" + lang;
                        line.appendChild(a);
                        clickable(a, function () {
                            onPageChanged.fire(p.id() + "/" + lang);
                        });
                    }
                }
                if (!p) { return; }
                if (!tit) { return; }
                if (visited[p.id()]) { return; }
                visited[p.id()] = 1;
                p.forEachChild(function (c) {
                    var c_elem = visit(c);
                    if (c_elem) {
                        c_elem.style.marginLeft = "20px";
                        subs.appendChild(c_elem);
                    }
                }, orderFunc);
                subs.style.display = "none";
                outer.appendChild(subs);
                setSelById[p.id()] = setSelected;
                subsById[p.id()] = subs;
                setSelected(false);
                return outer;
            }
            return (function () {
                var container = element("div");
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

    runNow(initTreeMenu);
}());
