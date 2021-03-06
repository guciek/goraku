
(function () {
    "use strict";

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
        clickable(e, function () {
            var p, curpid;
            if (!active) { return; }
            if (!getDb()) { return; }
            if (!getPage()) { return; }
            curpid = getPage().split("/");
            if (curpid.length === 2) {
                curpid = curpid[0];
            } else {
                curpid = "index";
            }
            p = getDb().page(curpid);
            if (p && (p.prop("title_" + newlang).length >= 1)) {
                onPageChanged.fire(curpid + "/" + newlang);
            } else {
                onPageChanged.fire("index/" + newlang);
            }
        });
    }

    function upgradeStaticLink(a) {
        var href = String(a.getAttribute("href"));
        if (href.charAt(0) !== "/") {
            a.target = "_blank";
        } else {
            href = href.split("/")[1];
            clickable(a, function () {
                onPageChanged.fire(href + "/" + getLang());
            });
        }
    }

    function initBrowserEvents() {
        function changePageFromBrowser() {
            onPageChanged.fire(
                String(window.location.pathname).substring(1),
                true
            );
            try {
                window.scroll(window.history.state.scrollx, window.history.state.scrolly);
            } catch (ignore) {}
        }
        changePageFromBrowser();
        window.onpopstate = changePageFromBrowser;
    }

    function clearContent() {
        $("title").style.display = "block";
        $("title_text").textContent = "";
        $("title_path").textContent = "";
        $("article").textContent = "";
        $("subs").textContent = "";
    }

    function onUpdate() {
        clearContent();
        var lang = getLang();
        if (lang) {
            document.body.className = "lang_" + lang;
        }
        setTimeout(function () {
            var tit = $("title_text").textContent;
            if (tit) {
                window.document.title = tit;
            }
        }, 20);
    }

    runNow(function () {
        $("hide_js_warning").textContent = "";
        if ($("hide_js_warning").childNodes.length !== 0) {
            return;
        }
        clearContent();
        $("article").appendChild(element("p", "Loading database..."));
        onPageChanged.add(function (newPath, browserInitiated) {
            if (browserInitiated) { return; }
            newPath = "/" + newPath;
            if (String(window.location.pathname) === newPath) { return; }
            try {
                window.history.pushState(
                    {
                        scrollx: window.scrollX,
                        scrolly: window.scrollY
                    },
                    newPath,
                    newPath
                );
                window.scroll(0, 0);
            } catch (ignore) {}
        });
        onPageChanged.add(onUpdate);
        onDbChanged.add(onUpdate);
        (function () {
            var initialized = false;
            onDbChanged.add(function () {
                if (!initialized) {
                    initialized = true;
                    setTimeout(initBrowserEvents, 10);
                }
            });
        }());
        (function () {
            var i, as;
            as = $("langs").getElementsByTagName("a");
            for (i = 0; i < as.length; i += 1) {
                upgradeLangLink(as[i]);
            }
            as = document.body.getElementsByTagName("a");
            for (i = 0; i < as.length; i += 1) {
                if (!as[i].onclick) {
                    upgradeStaticLink(as[i]);
                }
            }
        }());
    });
}());
