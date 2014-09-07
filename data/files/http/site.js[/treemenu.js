
(function () {
    "use strict";

    function animateHeightUnfold(e) {
        var h = 1;
        e.style.overflow = "hidden";
        e.style.maxHeight = h + "px";
        function step() {
            h = (h + 2) * 1.5;
            if (h > 2000) {
                e.style.maxHeight = undefined;
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
            var selected, visited = {}, linkById = {}, subsById = {};
            function orderFunc(c) {
                return (c.prop("sort") || "50") + c.prop("title_" + lang);
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
                subs = element("div");
                p.forEachChild(function (c) {
                    var c_elem = visit(c);
                    if (c_elem) {
                        c_elem.style.marginLeft = "20px";
                        subs.appendChild(c_elem);
                    }
                }, orderFunc);
                e = element("div", p.prop("title_" + lang));
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
                outer = element("div");
                outer.appendChild(e);
                outer.appendChild(subs);
                linkById[p.id()] = e;
                subsById[p.id()] = subs;
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

    try {
        initTreeMenu();
    } catch (err) {
        showError(err);
    }
}());
