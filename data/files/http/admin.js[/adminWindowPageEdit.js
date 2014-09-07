
function adminWindowPageEdit(edit_pid) {
    "use strict";

    function makeAutoid(s) {
        s = String(s).toLowerCase();
        s = s.replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
        s = s.replace(/^_+/, "").replace(/_+$/, "");
        s = getDb().sanitizeId(s);
        if (!s) { return s; }
        if (!getDb().page(s)) { return s; }
        var n = 2;
        while (getDb().page(s + "_" + n)) {
            n += 1;
        }
        return s + "_" + n;
    }

    function input_tags(initialTags, skip) {
        var e = element("div"), checkboxes = {};
        initialTags = initialTags.split(",");
        function updValue() {
            try {
                var ret = [];
                Object.keys(checkboxes).forEach(function (id) {
                    if (checkboxes[id].checked) {
                        ret.push(id);
                    }
                });
                ret.sort();
                e.value = ret.join(",");
                if (e.onchange) { e.onchange(); }
            } catch (err) {
                showError(err);
            }
        }
        function addtag(id) {
            var opt = element("div"), cb, label;
            opt.style.display = "inline-block";
            opt.style.marginRight = "10px";
            opt.style.overflow = "hidden";
            cb = element("input");
            cb.type = "checkbox";
            cb.onchange = cb.onkeyup = updValue;
            cb.style.marginRight = "5px";
            cb.style.verticalAlign = "middle";
            cb.id = "cb_" + Math.random();
            initialTags.forEach(function (tag) {
                if (tag === id) {
                    cb.checked = true;
                }
            });
            opt.appendChild(cb);
            label = element("label");
            label.textContent = id;
            label.htmlFor = cb.id;
            opt.appendChild(label);
            e.appendChild(opt);
            checkboxes[id] = cb;
        }
        getDb().forEachPage(function (p) {
            if (p.id() === skip) { return; }
            if (p.prop("type") === "tag") {
                addtag(p.id());
            }
        });
        updValue();
        return e;
    }

    function propertiesPanel(pid, parentid) {
        var e = element("div"),
            btn,
            autoid = "",
            btntit = "Save Changes",
            inputs = {},
            showHideInputs,
            input_ids = [
                "type",
                "title_en",
                "title_pl",
                "tags"
            ],
            fieldTitles = {
                "id": "Page Address",
                "type": "Page Type",
                "tags": "Tags"
            };
        function onInputChange() {
            e.propsChanged = true;
            btn.style.display = "block";
            if (showHideInputs) { showHideInputs(); }
        }
        function cap(text) {
            var d = element("div", text);
            d.style.width = "120px";
            d.style.display = "inline-block";
            d.style.overflow = "hidden";
            d.style.marginRight = "20px";
            return d;
        }
        function propEdit(propid, onsubmit) {
            var d = element("div"), inp, defvalue = "";
            (function () {
                if (!pid) { return; }
                var p = getDb().page(pid);
                if (p) {
                    defvalue = p.prop(propid);
                }
            }());
            function checkChanged() {
                if (String(inp.value) !== defvalue) {
                    onInputChange();
                }
            }
            if (propid === "tags") {
                inp = input_tags(defvalue, pid);
                inp.style.marginBottom = "10px";
                inp.style.width = "400px";
                inp.onchange = checkChanged;
                checkChanged();
                e.appendChild(inp);
                inputs[propid] = inp;
                return;
            }
            if (propid.substring(0, 6) === "title_") {
                d.appendChild(cap("Title (" +
                    propid.substring(6).toUpperCase() + "):"));
            } else {
                d.appendChild(cap(fieldTitles[propid] + ":"));
            }
            if (propid === "type") {
                inp = adminInputSelect();
                inp.onchange = inp.onkeyup = checkChanged;
                inp.addoption("", "Normal", defvalue === "");
                inp.addoption("tag", "Tag", defvalue === "tag");
            } else {
                inp = adminInputText(onsubmit);
                inp.value = defvalue;
                inp.onchange = inp.onkeyup = function () {
                    var s;
                    checkChanged();
                    if (propid === "id") {
                        s = getDb().sanitizeId(inp.value);
                        if (s !== String(inp.value)) {
                            inp.value = s;
                        }
                        if (s.length >= 1) {
                            autoid = "id";
                        }
                    } else if ((propid.substring(0, 6) === "title_") &&
                            ((autoid === "") || (autoid === propid))) {
                        autoid = propid;
                        if (inputs.id) {
                            inputs.id.value = makeAutoid(inp.value);
                            if (!inputs.id.value) { autoid = ""; }
                        }
                    }
                };
            }
            checkChanged();
            inp.style.width = "260px";
            inp.style.display = "inline-block";
            d.appendChild(inp);
            d.style.marginBottom = "10px";
            e.appendChild(d);
            inputs[propid] = inp;
        }
        if (parentid) {
            btntit = "Create";
            input_ids.push("id");
        }
        btn = adminSaveButton(btntit, function (showerror) {
            var p, data = {}, anytitle = false;
            Object.keys(inputs).forEach(function (id) {
                data[id] = String(inputs[id].value).trim();
                if ((id.substring(0, 6) === "title_") && data[id]) {
                    anytitle = true;
                }
            });
            if (data.type === "tag") {
                data.tags = "";
            }
            if (!anytitle) {
                showerror("Titles cannot all be empty");
                return;
            }
            function onerr(err) {
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
                getDb().create(p, data, onerr);
                return;
            }
            p = getDb().page(pid);
            if (!p) {
                showerror("Page not found");
                return;
            }
            p.forEachFile(function (fn) {
                fn = fn.split(".");
                if (fn.length !== 2) { return; }
                if (fn[1] !== "html") { return; }
                if (!data["title_" + fn[0]]) {
                    showerror("Title (" + fn[0].toUpperCase() +
                        ") cannot be empty");
                    p = undefined;
                }
            });
            if (p) {
                p.writeProps(data, onerr);
            }
        });
        btn.style.display = "none";
        input_ids.forEach(function (id) {
            propEdit(id,  btn.getElementsByTagName("input")[0].onclick);
        });
        showHideInputs = function () {
            inputs.tags.style.display =
                (inputs.type.value === "tag") ? "none" : "block";
        };
        showHideInputs();
        e.appendChild(btn);
        return e;
    }

    function showEdit(pid) {
        var e = element("div"), bottom = element("div"), links = element("div"), panel;
        makeWindow(e, "Edit Page: " + pid);
        e.appendChild(links);
        e.appendChild(bottom);
        panel = propertiesPanel(pid);
        bottom.appendChild(panel);
        function dbChanged() {
            var p = getDb().page(pid);
            if (!p) {
                e.close_window();
                return;
            }
            if (!panel.propsChanged) {
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
