
function adminWindowEditContent(edit_pid, edit_lang) {
    "use strict";

    function textEditor_insertImage_loadData(inp, onerror, ondata) {
        if (inp.files.length < 1) { return; }
        var f = inp.files[0],
            fr,
            fname,
            fext = "",
            maxsize = 1024 * 1024,
            binary;
        try {
            fr = new FileReader();
        } catch (err) {
            onerror("Your browser does not support the FileReader interface");
            return;
        }
        fname = String(inp.files[0].name).toLowerCase();
        if (fname.match(/\.(jpg|jpeg)$/)) {
            fext = "jpg";
        }
        if (fname.match(/\.png$/)) {
            fext = "png";
        }
        if (fext.length < 1) {
            onerror("Only JPG and PNG files are supported");
            return;
        }
        if (inp.files[0].size > maxsize) {
            onerror("File is too large");
            return;
        }
        onerror(false, "Loading image...");
        fr.onload = function (ev) {
            binary = String(ev.target.result);
            if (binary.length < 1) {
                onerror("Failed to load image");
                return;
            }
            if (binary.length > maxsize) {
                onerror("File is too large");
                return;
            }
            fr.onload = function (ev) {
                if (binary) {
                    var base64 = String(ev.target.result);
                    if (base64.substring(0, 11) !== "data:image/") {
                        onerror("Failed to read image");
                        return;
                    }
                    runNow(ondata, binary, base64, fext);
                    binary = undefined;
                }
            };
            fr.readAsDataURL(f);
        };
        fr.readAsBinaryString(f);
    }

    function textEditor_insertImage(append_html, pid) {
        var p = getDb().page(pid),
            popup = element("div"),
            inp = element("input"),
            msg = element("div");
        inp.type = "file";
        popup.appendChild(inp);
        popup.appendChild(msg);
        if (!p) {
            inp.style.display = "none";
            msg.textContent = "Error: Page does not exist";
            msg.style.color = "#f00";
            return popup;
        }

        function doUpload(binary, fext, thumb_jpg_b64, showerror) {
            var fn, thumb_fn, n = 1;
            fn = "img_" + n + "." + fext;
            thumb_fn = "img_" + n + "_t.jpg";
            while (p.hasFile(fn) || p.hasFile(thumb_fn)) {
                n = n + 1;
                fn = "img_" + n + "." + fext;
                thumb_fn = "img_" + n + "_t.jpg";
            }
            function writeBig() {
                p.writeFile(fn, binary, "binary", function (err) {
                    if (err) {
                        showerror(err);
                        return;
                    }
                    if (thumb_jpg_b64) {
                        append_html('<a href="/file/' + pid + '/' + fn +
                            '"><img src="/' + thumb_fn + '" /></a>');
                    } else {
                        append_html('<img src="/' + fn + '" />');
                    }
                    popup.close_window();
                });
            }
            if (thumb_jpg_b64) {
                p.writeFile(thumb_fn, thumb_jpg_b64, "base64", function (err) {
                    if (err) {
                        showerror(err);
                    } else {
                        writeBig();
                    }
                });
            } else {
                writeBig();
            }
        }

        function onData(binary, base64, fext) {
            inp.style.display = "none";
            msg.style.display = "none";
            var useThumb = true,
                thumbPanel = element("div"),
                thumbEditor,
                img = element("img");
            popup.appendChild((function () {
                var d = element("div"),
                    cb = element("input"),
                    label = element("label");
                cb.type = "checkbox";
                cb.style.marginRight = "5px";
                cb.style.verticalAlign = "middle";
                cb.id = "cb_" + Math.random();
                label.textContent = "Inline Full Image";
                label.htmlFor = cb.id;
                d.appendChild(cb);
                d.appendChild(label);
                cb.onchange = runLater(function () {
                    if (cb.checked) {
                        useThumb = false;
                        thumbPanel.style.display = "none";
                    } else {
                        useThumb = true;
                        thumbPanel.style.display = "block";
                    }
                });
                return d;
            }()));
            thumbPanel.style.marginTop = "10px";
            popup.appendChild(thumbPanel);
            popup.appendChild(adminSaveButton("Upload", function (showerror) {
                var thumb_data;
                if (useThumb) {
                    if (!thumbEditor) {
                        showerror("Could not parse image");
                        return;
                    }
                    thumb_data = thumbEditor.getBase64JPEG();
                    if (!thumb_data) {
                        showerror("Could not encode thumbnail image");
                        return;
                    }
                    doUpload(binary, fext, thumb_data, showerror);
                } else {
                    doUpload(binary, fext, undefined, showerror);
                }
            }));
            img.onload = function () {
                thumbEditor = thumbnailEditor(img);
                thumbPanel.appendChild(thumbEditor);
            };
            img.src = base64;
        }

        inp.onchange = runLater(function () {
            textEditor_insertImage_loadData(
                inp,
                function (err, info) {
                    inp.style.display = "none";
                    if (err) {
                        msg.textContent = "Error: " + err;
                        msg.style.color = "#f00";
                    } else {
                        msg.textContent = info;
                        msg.style.color = "#555";
                    }
                },
                onData
            );
        });

        return popup;
    }

    function textEditor_insertLinkToPage(append_html) {
        var popup = element("div"), select = adminInputSelect();
        popup.appendChild(select);
        select.style.width = "250px";
        select.addoption("", "", true);
        getDb().forEachPage(function (p) {
            p.forEachProp(function (pname) {
                if (pname.substring(0, 6) !== "title_") { return; }
                var l = "/" + p.id() + "/" + pname.substring(6);
                select.addoption(l, l);
            });
        });
        popup.appendChild(adminSaveButton("Add", function (showerror) {
            var l = select.value;
            if (l.charAt(0) !== "/") {
                showerror("Choose an option");
                return;
            }
            append_html('<a href="' + l + '">' + l + '</a>');
            popup.close_window();
        }));
        return popup;
    }

    function textEditor_insertLinkToURL(append_html) {
        var popup = element("div"), inp, btn;
        btn = adminSaveButton("Add", function (showerror) {
            var l = inp.value;
            if ((l.substring(0, 7) !== "http://") &&
                    (l.substring(0, 8) !== "https://")) {
                showerror("Invalid link");
                return;
            }
            append_html('<a href="' + l + '">' + l + '</a>');
            popup.close_window();
        });
        inp = adminInputText(btn.getElementsByTagName("input")[0].onclick);
        inp.value = "http://";
        inp.style.width = "250px";
        popup.appendChild(inp);
        popup.appendChild(btn);
        return popup;
    }

    function textEditor_buttons(append_html, pid, openPopupWindow) {
        function btn(text, cmd, par) {
            var l = adminLink(text, function () {
                try {
                    if ((cmd !== "formatBlock") && (cmd !== "removeFormat")) {
                        document.execCommand("removeFormat", false, false);
                    }
                    document.execCommand(cmd, false, par);
                } catch (ignore) {}
            });
            l.onmousedown = function (ev) {
                if (ev) { ev.preventDefault(); }
                return false;
            };
            return l;
        }
        var panel = element("div"), line = element("div");
        line.appendChild(element("span", "Paragraph: "));
        line.appendChild(btn(" regular ", "formatBlock", "p"));
        line.appendChild(element("span", " | "));
        line.appendChild(btn(" code ", "formatBlock", "pre"));
        line.appendChild(element("span", " | "));
        line.appendChild(btn(" header ", "formatBlock", "h1"));
        line.appendChild(element("span", " | "));
        line.appendChild(btn(" subheader ", "formatBlock", "h2"));
        line.style.marginBottom = "10px";
        panel.appendChild(line);
        line = element("div");
        line.appendChild(element("span", "Text style: "));
        line.appendChild(btn(" regular ", "removeFormat", false));
        line.appendChild(element("span", " | "));
        line.appendChild(btn(" bold ", "bold", false));
        line.appendChild(element("span", " | "));
        line.appendChild(btn(" italic ", "italic", false));
        line.appendChild(element("span", " | "));
        line.appendChild(btn(" superscript ", "superscript", false));
        line.style.marginBottom = "10px";
        panel.appendChild(line);
        line = element("div");
        line.appendChild(element("span", "Insert: "));
        line.appendChild(adminLink(" image ", function () {
            openPopupWindow(
                "Insert Image",
                textEditor_insertImage(append_html, pid)
            );
        }));
        line.appendChild(element("span", " | "));
        line.appendChild(adminLink(" link to page ", function () {
            openPopupWindow(
                "Insert Link to Page",
                textEditor_insertLinkToPage(append_html)
            );
        }));
        line.appendChild(element("span", " | "));
        line.appendChild(adminLink(" link to url ", function () {
            openPopupWindow(
                "Insert Link to URL",
                textEditor_insertLinkToURL(append_html)
            );
        }));
        line.style.marginBottom = "10px";
        panel.appendChild(line);
        return panel;
    }

    function showEditContent_dataLoaded(pid, lang, e, initContent) {
        var editable = element("div"), openPopupWindow;
        (function () {
            var popups = makeSet();
            openPopupWindow = function (title, content) {
                makeWindow(content, title);
                popups.add(content);
                content.onclose = function () {
                    popups.remove(content);
                };
            };
            e.onclose = function () {
                popups.forEach(function (p) { p.close_window(); });
            };
        }());
        function upgradeImage(img) {
            img.contentEditable = false;
            img.style.minWidth = "20px";
            img.style.minHeight = "20px";
            img.style.maxWidth = "40px";
            img.style.maxHeight = "40px";
            img.style.margin = "2px";
            img.style.verticalAlign = "middle";
        }
        function getCleanHtml(append) {
            var h = editable.innerHTML, imgs, i;
            if (append) {
                h += " " + append;
            }
            h = cleanHtml(h, "/file/" + pid + "/");
            editable.innerHTML = (h.length > 0) ? h : "<p></p>";
            imgs = editable.getElementsByTagName("img");
            for (i = 0; i < imgs.length; i = i + 1) {
                upgradeImage(imgs[i]);
            }
            return h;
        }
        e.appendChild(textEditor_buttons(getCleanHtml, pid, openPopupWindow));
        e.appendChild(editable);
        editable.style.overflowX = "hidden";
        editable.style.overflowY = "scroll";
        editable.style.border = "1px solid black";
        editable.style.padding = "5px";
        editable.style.background = "#fff";
        editable.style.minWidth = "300px";
        editable.style.minHeight = "100px";
        editable.style.width = "400px";
        editable.style.height = "300px";
        editable.style.resize = "both";
        editable.contentEditable = true;
        getCleanHtml(initContent);
        e.appendChild(adminSaveButton("Save", function (showerror) {
            var p = getDb().page(pid), data = getCleanHtml();
            if (!p) {
                showerror("Page does not exist");
                return;
            }
            p.writeFile(lang + ".html", data, "text", function (err) {
                if (err) {
                    showerror(err);
                } else {
                    e.close_window();
                }
            });
        }));
    }

    function showEdit(pid, lang) {
        var e = element("div", "Loading... "), p = getDb().page(pid);
        if (!p) {
            return;
        }
        makeWindow(e, "Edit Content: " + pid + " / " + lang);
        if (!p.hasFile(lang + ".html")) {
            e.textContent = "";
            showEditContent_dataLoaded(pid, lang, e, "");
            return;
        }
        p.onFileData(lang + ".html", function (data, err) {
            if (err) {
                e.textContent = "Error: " + err;
                e.style.color = "#f00";
                return;
            }
            e.textContent = "";
            showEditContent_dataLoaded(pid, lang, e, data);
        });
    }

    showEdit(edit_pid, edit_lang);
}
