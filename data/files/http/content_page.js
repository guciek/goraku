
(function () {
    "use strict";

    var zoomedImage;

    function $(id) {
        return document.getElementById(id);
    }

    function element(tag, content) {
        var e = document.createElement(String(tag));
        if (content) {
            if (typeof content === "object") {
                e.appendChild(content);
            } else {
                e.textContent = String(content);
            }
        }
        return e;
    }

    function clickable(e, action) {
        e.onclick = function (ev) {
            try {
                action();
            } catch (err) {
                showError(err);
            }
            if (ev) { ev.preventDefault(); }
            return false;
        };
        e.style.cursor = "pointer";
        return e;
    }

    function animateFadeIn(e) {
        var opacity = 0.01;
        function step() {
            opacity += 0.1;
            if (opacity > 0.9) {
                e.style.opacity = 1;
            } else {
                setTimeout(step, 25);
                e.style.opacity = opacity;
            }
        }
        setTimeout(step, 25);
        e.style.opacity = opacity;
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
        if (href.length !== 2) { markInvalid(a);  return; }
        linkedpage = getDb().page(href[0]);
        if (!linkedpage) { markInvalid(a);  return; }
        if (linkedpage.prop("title_" + href[1]).length < 1) {
            markInvalid(a);
            return;
        }
        clickable(a, function () {
            onPageChanged.fire(href[0] + "/" + href[1]);
        });
    }

    function subPageLi(pid, lang) {
        var p, tit, li, a, img;
        p = getDb().page(pid);
        if (!p) { return; }
        tit = p.prop("title_" + lang);
        if (tit.length < 1) { return; }
        li = document.createElement("li");
        a = document.createElement("a");
        a.href = "/" + pid + "/" + lang;
        li.appendChild(a);
        clickable(a, function () {
            onPageChanged.fire(pid + "/" + lang);
        });
        if (p.hasFile("icon.jpg")) {
            img = document.createElement("img");
            img.src = "/file/" + pid + "/icon.jpg";
            a.appendChild(img);
        }
        a.appendChild(element("span", tit));
        return li;
    }

    function makeImageZoomable(img) {
        if (img.onclick) {
            return;
        }
        if (!zoomedImage) {
            zoomedImage = element("div");
            document.body.appendChild(zoomedImage);
        }
        function displayPopup(popup, newimg) {
            var w = newimg.width,
                h = newimg.height,
                win_w = window.innerWidth ||
                    document.documentElement.clientWidth,
                win_h = window.innerHeight ||
                    document.documentElement.clientHeight,
                scale = 1;
            if ((w < 2) || (h < 2)) {
                return;
            }
            if ((win_w - 40) / w < scale) {
                scale = (win_w - 40) / w;
            }
            if ((win_h - 40) / h < scale) {
                scale = (win_h - 40) / h;
            }
            w = Math.round(scale * w);
            h = Math.round(scale * h);
            newimg.style.border = "0";
            newimg.style.padding = "0";
            newimg.style.margin = "0";
            popup.appendChild(newimg);
            popup.style.position = "fixed";
            popup.style.padding = "10px";
            popup.style.margin = "0";
            popup.style.background = "#000";
            popup.style.width = newimg.style.width = w + "px";
            popup.style.height = newimg.style.height = h + "px";
            popup.style.left = Math.round((win_w - w - 20) / 2) + "px";
            popup.style.top = Math.round((win_h - h - 20) / 2) + "px";
            animateFadeIn(popup);
        }
        img.onmouseover = function () {
            img.style.opacity = 0.6;
        };
        img.onmouseout = function () {
            img.style.opacity = 1;
        };
        clickable(img, function () {
            var newimg = document.createElement("img"),
                popup = element("div");
            zoomedImage.textContent = "";
            zoomedImage.appendChild(popup);
            newimg.onload = function () {
                try {
                    displayPopup(popup, newimg);
                } catch (err) {
                    showError(err);
                }
            };
            clickable(newimg, function () {
                zoomedImage.textContent = "";
            });
            newimg.src = img.src;
        });
    }

    function upgradeImage(img) {
        var iconSize = { width: 145, height: 110 };
        if (img.alt === "[zoom]") {
            img.style.maxWidth = iconSize.width + "px";
            img.style.maxHeight = iconSize.height + "px";
            makeImageZoomable(img);
        }
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
        var a = document.createElement("a"),
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
            return c.prop("title_" + lang);
        });
        children.forEach(function (c) {
            var sub = subPageLi(c.id(), lang);
            if (sub) {
                $("subs").appendChild(sub);
            }
        });
    }

    try {
        onPageChanged.add(function (path) {
            if (zoomedImage) {
                zoomedImage.textContent = "";
            }
            path = path.split("/");
            if (path.length !== 2) { return; }
            var p = getDb().page(path[0]);
            if (!p) { return; }
            addContentPage(path[0], path[1]);
        });
    } catch (err) {
        showError(err);
    }
}());
