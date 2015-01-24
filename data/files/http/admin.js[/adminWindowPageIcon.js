
function adminWindowPageIcon(pid) {
    "use strict";

    var e = element("div"),
        inp = element("input"),
        iconPanel = element("div"),
        editor;

    makeWindow(e, "Icon: " + pid);

    inp.type = "file";
    inp.style.width = "250px";
    inp.style.padding = "0";
    inp.style.border = "0";
    inp.style.background = "transparent";
    inp.style.marginBottom = "10px";
    e.appendChild(element("div", inp));

    iconPanel.textContent = "[no icon]";
    e.appendChild(iconPanel);

    inp.onchange = runLater(function () {
        if (inp.files.length < 1) { return; }
        var fr = new FileReader();
        fr.onload = function (ev) {
            var img = element("img");
            img.onload = runLater(function () {
                editor = thumbnailEditor(img);
                iconPanel.textContent = "";
                iconPanel.appendChild(editor);
            });
            img.src = ev.target.result;
        };
        fr.readAsDataURL(inp.files[0]);
    });

    e.appendChild(adminSaveButton("Save", function (showerror) {
        var p = getDb().page(pid), data;
        if (!p) {
            e.close_window();
            return;
        }
        if (editor) {
            data = editor.getBase64JPEG();
            if (!data) {
                showerror("Could not encode thumbnail image");
                return;
            }
        } else {
            data = "";
        }
        p.writeFile("icon.jpg", data, "base64", function (err) {
            if (err) {
                showerror(err);
            } else {
                e.close_window();
            }
        });
    }));

    function dbChanged() {
        if (!getDb().page(pid)) {
            e.close_window();
        }
    }

    onDbChanged.add(dbChanged);

    e.onclose = function () {
        onDbChanged.remove(dbChanged);
    };

    dbChanged();
}
