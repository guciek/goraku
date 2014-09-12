
var $,
    runNow,
    runLater,
    element,
    clickable,
    makeSet,
    makeEvent,
    onDbChanged,
    onPageChanged,
    onArticleLoaded,
    getDb,
    getPage,
    getLang;

(function () {
    "use strict";

    function showError(msg) {
        try {
            var e = document.createElement("div"),
                lc = document.getElementById("leftcolumn");
            e.innerHTML = "Error: " + msg;
            e.className = "jswarning";
            lc.insertBefore(e, lc.firstChild);
        } catch (err) {
            alert("Error: " + msg);
        }
    }

    Array.prototype.forEach = function (f) {
        var i, len = this.length;
        if (typeof f !== "function") {
            throw new TypeError();
        }
        for (i = 0; i < len; i += 1) {
            if (this.hasOwnProperty(i)) {  f(this[i], i);  }
        }
    };

    $ = function (id) {
        return document.getElementById(id);
    };

    runNow = function (action, p1, p2, p3) {
        try {
            action(p1, p2, p3);
        } catch (err) {
            showError(err);
        }
    };

    runLater = function (action, p1, p2, p3) {
        return function () {
            try {
                action(p1, p2, p3);
            } catch (err) {
                showError(err);
            }
        };
    };

    element = function (tag, content) {
        var e = document.createElement(String(tag));
        if (content) {
            if (typeof content === "object") {
                e.appendChild(content);
            } else {
                e.textContent = String(content);
            }
        }
        return e;
    };

    clickable = function (e, action) {
        e.onclick = function (ev) {
            runNow(action);
            if (ev) { ev.preventDefault(); }
            return false;
        };
        e.style.cursor = "pointer";
        return e;
    };

    makeSet = function () {
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
    };

    makeEvent = function () {
        var callbacks = makeSet();
        return {
            add: callbacks.add,
            remove: callbacks.remove,
            removeAll: callbacks.removeAll,
            fire: function (p1, p2, p3) {
                callbacks.forEach(function (callback) {
                    runNow(callback, p1, p2, p3);
                });
            }
        };
    };

    onDbChanged = makeEvent();

    onPageChanged = makeEvent();

    onArticleLoaded = makeEvent();

    (function () {
        var db, page, lang;
        onDbChanged.add(function (v) {
            if (!v) { return; }
            db = v;
        });
        onPageChanged.add(function (v) {
            if (!v) { return; }
            page = v;
            v = v.split("/");
            if (v.length !== 2) { return; }
            if (!v[1]) { return; }
            lang = v[1];
        });
        getDb = function () {
            return db;
        };
        getPage = function () {
            return page;
        };
        getLang = function () {
            return lang;
        };
    }());
}());
