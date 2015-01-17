
(function () {
    "use strict";

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

    function upgradeLink(a) {
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
        if (href.length !== 2) {
            markInvalid(a);
            return;
        }
        linkedpage = getDb().page(href[0]);
        if (!linkedpage) {
            markInvalid(a);
            return;
        }
        if (linkedpage.prop("title_" + href[1]).length < 1) {
            markInvalid(a);
            return;
        }
        clickable(a, function () {
            onPageChanged.fire(href[0] + "/" + href[1]);
        });
    }

    function upgradeImage(img) {
        if (!img.alt) {
            img.alt = "[img]";
        }
        function markInvalid(img) {
            img.src = "/file/missing_image.png";
            img.alt = "[missing]";
        }
        var p, src = String(img.getAttribute("src"));
        if (src.substring(0, 5) === "data:") {
            return;
        }
        if (src.substring(0, 6) !== "/file/") {
            markInvalid(img);
            return;
        }
        src = src.substring(6).split("/");
        if (src.length !== 2) {
            markInvalid(img);
            return;
        }
        p = getDb().page(src[0]);
        if (!p) {
            markInvalid(img);
            return;
        }
        if (!p.hasFile(src[1])) {
            markInvalid(img);
        }
    }

    function subPageLi(pid, lang) {
        var p, tit, li, a, img;
        p = getDb().page(pid);
        if (!p) { return; }
        tit = p.prop("title_" + lang);
        if (tit.length < 1) { return; }
        li = element("li");
        a = element("a");
        a.href = "/" + pid + "/" + lang;
        li.appendChild(a);
        clickable(a, function () {
            onPageChanged.fire(pid + "/" + lang);
        });
        if (p.hasFile("icon.jpg")) {
            img = element("img");
            img.src = "/file/" + pid + "/icon.jpg";
            a.appendChild(img);
        }
        a.appendChild(element("span", tit));
        return li;
    }

    function processLinks(elem) {
        var i, links = elem.getElementsByTagName("a");
        for (i = 0; i < links.length; i += 1) {
            upgradeLink(links[i]);
        }
    }

    function processImages(elem) {
        var i, imgs = elem.getElementsByTagName("img");
        for (i = 0; i < imgs.length; i += 1) {
            upgradeImage(imgs[i]);
        }
    }

    function addParentLink(parent) {
        var a = element("a"),
            parent_tit,
            link;
        if (!parent) { return; }
        if (parent.id() === "index") { return; }
        parent_tit = parent.prop("title_" + getLang());
        if (!parent_tit) { return; }
        a.textContent = parent_tit;
        link = parent.id() + "/" + getLang();
        a.href = "/" + link;
        clickable(a, function () {
            onPageChanged.fire(link);
        });
        $("title_path").appendChild(element("span", a));
    }

    function addContentPage(pid, lang) {
        var p = getDb().page(pid),
            tit = p.prop("title_" + lang),
            articleContent = element("div"),
            children = [],
            visitedSubs = {};
        function addChild(c) {
            if (visitedSubs[c.id()]) { return; }
            visitedSubs[c.id()] = true;
            children.push(c);
        }
        if (!tit) { return; }
        if (pid === "index") {
            $("title").style.display = "none";
        }
        $("title_text").textContent = tit;
        addParentLink(p.parent());
        $("article").appendChild(articleContent);
        if (p.hasFile(lang + ".html")) {
            articleContent.appendChild(element("p", "Loading..."));
            p.onFileData(lang + ".html", function (r, err) {
                if (err || (!r)) {
                    articleContent.textContent = "";
                    articleContent.appendChild(element("p", "Loading failed!"));
                    return;
                }
                articleContent.innerHTML = r;
                processLinks(articleContent);
                processImages(articleContent);
                onArticleLoaded.fire();
            });
        }
        p.forEachChild(addChild);
        if (p.prop("type") === "tag") {
            getDb().forEachPage(function (c) {
                if (c.prop("type") === "tag") { return; }
                c.prop("tags").split(",").forEach(function (t) {
                    if (t === pid) {
                        addChild(c);
                    }
                });
            });
        }
        children = sortByFunc(children, function (c) {
            return (c.prop("sort") || "50") + c.prop("title_" + lang);
        });
        children.forEach(function (c) {
            var sub = subPageLi(c.id(), lang);
            if (sub) {
                $("subs").appendChild(sub);
            }
        });
    }

    function onUpdate() {
        var p, path = getPage();
        if (!path) { return; }
        path = path.split("/");
        if (path.length !== 2) { return; }
        p = getDb().page(path[0]);
        if (!p) { return; }
        addContentPage(path[0], path[1]);
    }

    runNow(function () {
        onDbChanged.add(onUpdate);
        onPageChanged.add(onUpdate);
    });
}());
