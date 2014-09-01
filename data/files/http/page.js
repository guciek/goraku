
var showError, onDbChanged, onPageChanged;

Array.prototype.forEach = function (f) {
    "use strict";
    var i, len = this.length;
    if (typeof f !== "function") {
        throw new TypeError();
    }
    for (i = 0; i < len; i += 1) {
        if (this.hasOwnProperty(i)) {  f(this[i], i);  }
    }
};

(function () {
    "use strict";

    function error(msg) {
        try {
            var e = document.createElement("div"),
                lc = document.getElementById("leftcolumn");
            e.textContent = "Error: " + msg;
            e.className = "jswarning";
            lc.insertBefore(e, lc.firstChild);
        } catch (err) {
            alert("Error: " + msg);
        }
    }

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

    function makeDbWrapper(data) {
        var children = {},
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
        function wrappage(pid) {
            if (!data[pid]) { return undefined; }
            function findFile(fn) {
                var found = false;
                data[pid].files.forEach(function (f) {
                    found = found || (f === fn);
                });
                return found;
            }
            return {
                id: function () {
                    return pid;
                },
                prop: function (k) {
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
                    postRequest("/file/" + fn, fn, function (resp, err) {
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
                    if (!children[pid]) { return; }
                    if (!orderfunc) {
                        orderfunc = function (p) { return p.id(); };
                    }
                    var wrapall = [];
                    children[pid].forEach(function (c) {
                        wrapall.push(wrappage(c));
                    });
                    sortByFunc(wrapall, orderfunc).forEach(f);
                },
                parent: function () {
                    var parentid = data[pid].props.parent;
                    if (!parentid) { return undefined; }
                    return wrappage(parentid);
                }
            };
        }
        return {
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
            }
        };
    }

    showError = error;

    function initPageEvents() {
        function changePageFromBrowser() {
            onPageChanged.fire(
                String(window.location.pathname).substring(1),
                true
            );
        }
        changePageFromBrowser();
        window.onpopstate = changePageFromBrowser;
        onPageChanged.add(function (newPath, browserInitiated) {
            if (browserInitiated) { return; }
            var path = newPath.split("/");
            if (path.length !== 2) { return; }
            newPath = "/" + newPath;
            if (String(window.location.pathname) === newPath) { return; }
            window.history.pushState({}, newPath, newPath);
        });
    }

    function dbLoadStart() {
        postRequest(
            "/db",
            "getdb;" + String(new Date().getTime()),
            function (d) {
                if ((d.length < 1) || (d[0] !== "{")) {
                    error("Could not load database!");
                    return;
                }
                d = eval("(" + d + ")");
                if (!d) {
                    error("Invalid database data!");
                    return;
                }
                onDbChanged.fire(makeDbWrapper(d));
                initPageEvents();
            }
        );
    }

    try {
        dbLoadStart();
        onDbChanged = makeEvent();
        onPageChanged = makeEvent();
    } catch (err) {
        error(err);
    }
}());
