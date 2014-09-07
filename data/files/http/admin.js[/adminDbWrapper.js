
function adminDbWrapper(data, postRequest) {
    "use strict";

    var db,
        children = {},
        pendingRequests = {},
        fileCache = {};

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

    function sanitizeId(s) {
        var i, c, ret = "";
        s = String(s);
        for (i = 0; i < s.length; i += 1) {
            c = s.charCodeAt(i);
            if (((c >= 97) && (c <= 122)) || ((c >= 48) && (c <= 57)) ||
                    (c === 95)) {
                ret += String.fromCharCode(c);
            }
        }
        return ret;
    }

    function strToUint8Array(s) {
        var len = s.length, arr, i;
        arr = new Uint8Array(len);
        for (i = 0; i < len; i += 1) {
            arr[i] = s.charCodeAt(i);
        }
        return arr;
    }

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

    function wrappage(pid, skip) {
        if ((!data[pid]) && (skip !== "skipcheck")) { return undefined; }
        function findFile(fn) {
            if (!data[pid]) { return false; }
            var found = false;
            data[pid].files.forEach(function (f) {
                found = found || (f === fn);
            });
            return found;
        }
        return {
            id: function () {
                if (!data[pid]) { return ""; }
                return pid;
            },
            prop: function (k) {
                if (!data[pid]) { return ""; }
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
                if (pendingRequests[pid]) {
                    ondata("", "Request already pending");
                    return;
                }
                pendingRequests[pid] = 1;
                postRequest("/file/" + fn, fn, function (resp, err) {
                    delete pendingRequests[pid];
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
                var wrapall = [];
                if (!data[pid]) { return; }
                if (!children[pid]) { return; }
                if (!orderfunc) {
                    orderfunc = function (p) { return p.id(); };
                }
                children[pid].forEach(function (c) {
                    wrapall.push(wrappage(c));
                });
                sortByFunc(wrapall, orderfunc).forEach(f);
            },
            parent: function () {
                var parentid;
                if (!data[pid]) { return undefined; }
                parentid = data[pid].props.parent;
                if (!parentid) { return undefined; }
                return wrappage(parentid);
            },
            forEachProp: function (onprop) {
                if (!data[pid]) { return; }
                var kk = Object.keys(data[pid].props);
                kk.sort();
                kk.forEach(function (k) {
                    var v = data[pid].props[k];
                    if ((k.length > 0) && (v.length > 0) &&
                            (k !== "parent")) {
                        onprop(k, v);
                    }
                });
            },
            forEachFile: function (f) {
                if (!data[pid]) { return; }
                data[pid].files.sort();
                data[pid].files.forEach(f);
            },
            writeProps: function (map, onerror) {
                if ((!data[pid]) && (skip !== "skipcheck")) {
                    onerror("Page does not exist");
                    return;
                }
                var sendData = pid + "\n";
                if (pendingRequests[pid]) {
                    onerror("Request already pending");
                    return;
                }
                pendingRequests[pid] = 1;
                Object.keys(map).forEach(function (k) {
                    sendData += k + "=" + String(map[k]).trim() + "\n";
                });
                sendData += "..END..";
                postRequest("/admin/setprops", sendData, function (resp, err) {
                    delete pendingRequests[pid];
                    if (resp.substring(0, pid.length + 1) === pid + "=") {
                        var a = eval("(" + resp.substring(pid.length + 1) + ")");
                        data[pid] = a;
                        updChildren();
                        onerror();
                        onDbChanged.fire(db);
                        return;
                    }
                    if (!err) { err = resp; }
                    if (!err) { err = "Error"; }
                    onerror(err);
                });
            },
            writeFile: function (fn, fdata, enc, onerror) {
                if (!data[pid]) {
                    onerror("Page does not exist");
                    return;
                }
                if ((enc !== "text") && (enc !== "binary") &&
                        (enc !== "base64")) {
                    onerror("Invalid encoding");
                    return;
                }
                fdata = String(fdata);
                if (!fdata) {
                    fdata = "";
                    enc = "empty";
                }
                if (pendingRequests[pid]) {
                    onerror("Request already pending");
                    return;
                }
                pendingRequests[pid] = 1;
                fn = pid + "/" + fn;
                var sendData = fn + "=" + enc + ":" + fdata;
                if (enc === "binary") {
                    sendData = strToUint8Array(sendData);
                }
                postRequest("/admin/setfile", sendData, function (resp, err) {
                    delete pendingRequests[pid];
                    if (resp.substring(0, pid.length + 1) === pid + "=") {
                        var a = eval("(" + resp.substring(pid.length + 1) + ")");
                        data[pid] = a;
                        fileCache[fn] = fdata;
                        updChildren();
                        onerror();
                        onDbChanged.fire(db);
                        return;
                    }
                    if (!err) { err = resp; }
                    if (!err) { err = "Error"; }
                    onerror(err);
                });
            },
            remove: function (onerror) {
                if (!data[pid]) {
                    onerror("Page does not exist");
                    return;
                }
                if (pendingRequests[pid]) {
                    onerror("Request already pending");
                    return;
                }
                pendingRequests[pid] = 1;
                postRequest("/admin/del", pid, function (resp, err) {
                    delete pendingRequests[pid];
                    if (resp === pid + "=REMOVED") {
                        delete data[pid];
                        fileCache = {};
                        updChildren();
                        onerror();
                        onDbChanged.fire(db);
                        return;
                    }
                    if (!err) { err = resp; }
                    if (!err) { err = "Error"; }
                    onerror(err);
                });
            }
        };
    }

    db = {
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
        },
        create: function (pid, map, onerror) {
            pid = sanitizeId(pid);
            if (pid.length < 1) {
                onerror("Invalid id");
                return;
            }
            if (data[pid]) {
                onerror("Page already exists");
                return;
            }
            if ((!map.parent) || (!data[map.parent])) {
                onerror("Invalid parent id");
                return;
            }
            if (pendingRequests[map.parent] || pendingRequests[pid]) {
                onerror("Request already pending");
                return;
            }
            wrappage(pid, "skipcheck").writeProps(map, onerror);
        },
        sanitizeId: sanitizeId
    };

    return db;
}
