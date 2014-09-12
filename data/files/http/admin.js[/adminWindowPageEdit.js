
function adminWindowPageEdit(edit_pid) {
    "use strict";

    function makeAutoid(s) {
        s = String(s).trim().toLowerCase();
        s = s.replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
        s = s.replace(/^_+/, "").replace(/_+$/, "");
        s = getDb().sanitizeId(s);
        if (!s) { return ""; }
        if (!getDb().page(s)) { return s; }
        var n = 2;
        while (getDb().page(s + "_" + n)) {
            n += 1;
        }
        return s + "_" + n;
    }

    function cap(text) {
        var d = element("div", text);
        d.style.width = "120px";
        d.style.display = "inline-block";
        d.style.overflow = "hidden";
        d.style.marginRight = "20px";
        return d;
    }

    function textProperty(title) {
        return function (defvalue) {
            var d = element("div"),
                userEdited = false,
                inp = adminInputText(function () {
                    if (d.onsubmit) {
                        d.onsubmit();
                    }
                });
            inp.value = d.value = defvalue;
            d.appendChild(cap(title + ":"));
            inp.style.width = "260px";
            inp.style.display = "inline-block";
            inp.onchange = inp.onkeyup = function () {
                d.value = inp.value;
                userEdited = true;
                if (d.onchange) {
                    d.onchange();
                }
            };
            d.appendChild(inp);
            d.setautovalue = function (v) {
                if (!userEdited) {
                    inp.value = d.value = v;
                }
            };
            return d;
        };
    }

    function selectProperty(title, options) {
        return function (defvalue) {
            var d = element("div"),
                inp = adminInputSelect();
            options.forEach(function (opt) {
                inp.addoption(opt[0], opt[1], defvalue === opt[0]);
            });
            d.value = inp.value;
            d.appendChild(cap(title + ":"));
            inp.style.width = "260px";
            inp.style.display = "inline-block";
            inp.onchange = inp.onkeyup = function () {
                d.value = inp.value;
                if (d.onchange) {
                    d.onchange();
                }
            };
            d.appendChild(inp);
            return d;
        };
    }

    function multiSelectProperty(options) {
        return function (defvalue) {
            var e = element("div"),
                checkboxes = {};
            function updValue() {
                var ret = [];
                Object.keys(checkboxes).forEach(function (id) {
                    if (checkboxes[id].checked) {
                        ret.push(id);
                    }
                });
                ret.sort();
                e.value = ret.join(",");
                if (e.onchange) { e.onchange(); }
            }
            defvalue = defvalue.split(",");
            options.forEach(function (val) {
                var opt = element("div"),
                    cb = element("input"),
                    label = element("label");
                opt.style.display = "inline-block";
                opt.style.marginRight = "10px";
                opt.style.overflow = "hidden";
                cb.type = "checkbox";
                cb.onchange = cb.onkeyup = runLater(updValue);
                cb.style.marginRight = "5px";
                cb.style.verticalAlign = "middle";
                cb.id = "cb_" + Math.random();
                defvalue.forEach(function (v) {
                    if (v === val) {
                        cb.checked = true;
                    }
                });
                opt.appendChild(cb);
                label.textContent = val;
                label.htmlFor = cb.id;
                opt.appendChild(label);
                e.appendChild(opt);
                checkboxes[val] = cb;
            });
            updValue();
            e.style.width = "400px";
            return e;
        };
    }

    function titleProperty(defvalue, pid, propid) {
        var lang = propid.substring(6),
            tit = "Title (" + lang.toUpperCase() + ")",
            d = textProperty(tit)(defvalue);
        d.checkvalue = function () {
            if (!pid) {
                return;
            }
            var p = getDb().page(pid);
            if (!p) {
                return "Page not found";
            }
            if (!String(d.value).trim()) {
                if (p.hasFile(lang + ".html")) {
                    return tit + " cannot be empty";
                }
            }
        };
        return d;
    }

    function tagsProperty(defvalue, pid) {
        var d, opts = [];
        getDb().forEachPage(function (p) {
            if (p.id() === pid) { return; }
            if (p.prop("type") === "tag") {
                opts.push(p.id());
            }
        });
        d = multiSelectProperty(opts)(defvalue);
        d.isvisible = function (type) {
            return (type !== "tag");
        };
        return d;
    }

    function idProperty(defvalue, pid) {
        var d = textProperty("Page Address")(defvalue),
            d_autoval = d.setautovalue;
        if (pid) { return; }
        d.checkvalue = function () {
            var v = String(d.value).trim();
            if (!v) {
                return "Page Address is empty";
            }
            if (v !== getDb().sanitizeId(v)) {
                return "Page Address contains disallowed characters";
            }
            if (getDb().page(v)) {
                return "A page with this address already exists";
            }
        };
        d.setautovalue = function (v) {
            d_autoval(makeAutoid(v));
        };
        return d;
    }

    var properties = [];

    properties.push([
        "type",
        selectProperty("Page Type", [
            ["", "Normal"],
            ["tag", "Tag"]
        ])
    ]);
    properties.push(["title_en", titleProperty]);
    properties.push(["title_pl", titleProperty]);
    properties.push([
        "sort",
        selectProperty("Sort Order", [
            ["10", "First"],
            ["30", "Before Default"],
            ["", "Default"],
            ["70", "After Default"],
            ["90", "Last"]
        ])
    ]);
    properties.push(["tags", tagsProperty]);
    properties.push(["id", idProperty]);

    function propertiesPanel(pid, parentid) {
        var e = element("div"),
            btn,
            inputs = {},
            autoid = "";
        function isVisible(id) {
            if (!inputs.type) { return false; }
            if (!inputs[id].isvisible) { return true; }
            return inputs[id].isvisible(inputs.type.value);
        }
        function showHideProperties() {
            Object.keys(inputs).forEach(function (id) {
                inputs[id].style.display = isVisible(id) ? "block" : "none";
            });
        }
        btn = adminSaveButton(
            parentid ? "Create" : "Save Changes",
            function (showerror) {
                var p,
                    data = {},
                    anytitle = false,
                    last_error;
                Object.keys(inputs).forEach(function (id) {
                    if (isVisible(id)) {
                        if (inputs[id].checkvalue) {
                            var check = inputs[id].checkvalue();
                            if (check) {
                                last_error = check;
                            }
                        }
                        data[id] = String(inputs[id].value).trim();
                        if ((id.substring(0, 6) === "title_") && data[id]) {
                            anytitle = true;
                        }
                    } else {
                        data[id] = "";
                    }
                });
                if (!anytitle) {
                    last_error = "Titles cannot all be empty";
                }
                if (last_error) {
                    showerror(last_error);
                    return;
                }
                function on_write_err(err) {
                    if (err) {
                        showerror(err);
                    } else {
                        showerror();
                        btn.style.display = "none";
                        e.propsChanged = undefined;
                        if (e.close_window) {
                            e.close_window();
                        }
                    }
                }
                if (!pid) {
                    p = data.id;
                    delete data.id;
                    data.parent = parentid;
                    getDb().create(p, data, on_write_err);
                    return;
                }
                p = getDb().page(pid);
                if (p) {
                    p.writeProps(data, on_write_err);
                } else {
                    showerror("Page not found");
                }
            }
        );
        btn.style.display = "none";
        properties.forEach(function (id_constr) {
            var inp,
                p,
                defvalue = "";
            function onchange() {
                showHideProperties();
                if (String(inp.value) !== defvalue) {
                    e.propsChanged = true;
                    btn.style.display = "block";
                }
                if (inputs.id && (id_constr[0].substring(0, 6) === "title_") &&
                        ((autoid === "") || (autoid === id_constr[0]))) {
                    autoid = id_constr[0];
                    inputs.id.setautovalue(inp.value);
                    if (!inp.value) { autoid = ""; }
                }
            }
            if (pid) {
                p = getDb().page(pid);
                if (p) {
                    defvalue = p.prop(id_constr[0]);
                }
            }
            inp = id_constr[1](defvalue, pid, id_constr[0]);
            if (!inp) { return; }
            onchange();
            inp.onchange = onchange;
            inp.onsubmit = btn.getElementsByTagName("input")[0].onclick;
            inp.style.marginBottom = "10px";
            e.appendChild(inp);
            inputs[id_constr[0]] = inp;
        });
        showHideProperties();
        e.appendChild(btn);
        return e;
    }

    function showEdit(pid) {
        var e = element("div"),
            bottom = element("div"),
            links = element("div"),
            panel;
        makeWindow(e, "Edit Page: " + pid);
        e.appendChild(links);
        e.appendChild(bottom);
        function dbChanged() {
            var p = getDb().page(pid);
            if (!p) {
                e.close_window();
                return;
            }
            if ((!panel) || (!panel.propsChanged)) {
                bottom.textContent = "";
                panel = propertiesPanel(pid);
                bottom.appendChild(panel);
            }
            links.textContent = "";
            links.style.marginBottom = "10px";
            links.appendChild(adminLink(
                "set icon",
                function () { adminWindowPageIcon(pid); }
            ));
            p.forEachProp(function (k) {
                if (k.substring(0, 6) !== "title_") { return; }
                k = k.substring(6);
                links.appendChild(element("span", " |"));
                links.appendChild(adminLink(
                    " edit " + k,
                    function () { adminWindowEditContent(pid, k); }
                ));
            });
            if (pid !== "index") {
                links.appendChild(element("span", " |"));
                links.appendChild(adminLink(
                    " move",
                    function () { adminWindowPageMove(pid); }
                ));
            }
            links.appendChild(element("span", " |"));
            links.appendChild(adminLink(
                " new page",
                function () {
                    makeWindow(
                        propertiesPanel(undefined, pid),
                        "Create New Page (in: " + pid + ")"
                    );
                }
            ));
            if (adminIsDeletePossible(pid)) {
                links.appendChild(element("span", " | "));
                links.appendChild(adminLink(
                    " delete",
                    function () { adminWindowPageDelete(pid); }
                ));
            }
        }
        onDbChanged.add(dbChanged);
        e.onclose = function () {
            onDbChanged.remove(dbChanged);
        };
        dbChanged();
    }

    showEdit(edit_pid);
}
