
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

    function postRequest(url, data, onresponse) {
        var req = new XMLHttpRequest();
        req.open("POST", url, true);
        req.setRequestHeader("Content-Type", "application/octet-stream");
        req.onreadystatechange = runLater(function () {
            if (req.readyState < 4) {
                return;
            }
            if (req.status === 200) {
                onresponse(String(req.responseText));
            } else if (req.status) {
                onresponse("", "HTTP code " + req.status);
            } else {
                onresponse("", "HTTP error");
            }
        });
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
                forEachProp: function (onprop) {
                    if (!data[pid]) { return; }
                    var k, v;
                    for (k in data[pid].props) {
                        if (data[pid].props.hasOwnProperty(k)) {
                            v = data[pid].props[k];
                            if ((k !== "parent") && (k.length > 0) &&
                                    (v.length > 0)) {
                                onprop(k, v);
                            }
                        }
                    }
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

    function dbLoadStart() {
        postRequest(
            "/db",
            "getdb;" + String(new Date().getTime()),
            function (d) {
                if ((d.length < 1) || (d[0] !== "{")) {
                    throw "Could not load database!";
                }
                try {
                    d = eval("(" + d + ")");
                    if (!d) { throw "empty"; }
                } catch (err) {
                    throw "Invalid database data!";
                }
                onDbChanged.fire(makeDbWrapper(d));
            }
        );
    }

    runNow(dbLoadStart);
}());
