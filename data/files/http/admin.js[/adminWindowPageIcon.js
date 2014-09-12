
function adminWindowPageIcon(pid) {
    "use strict";

    var iconSize = { width: 145, height: 110 },
        e = element("div"),
        canvas = element("canvas"),
        inp = adminInputText(),
        draw,
        empty = true;

    function setImg(img) {
        var crop_w = img.width,
            crop_h = img.height;
        if ((crop_w < 5) || (crop_h < 5)) { return; }
        if (crop_w / crop_h > iconSize.width / iconSize.height) {
            crop_w = crop_h * (iconSize.width / iconSize.height);
        } else if (crop_h / crop_w > iconSize.height / iconSize.width) {
            crop_h = crop_w * (iconSize.height / iconSize.width);
        }
        draw.fillStyle = "#fff";
        draw.fillRect(0, 0, iconSize.width, iconSize.height);
        draw.drawImage(
            img,
            (img.width - crop_w) / 2,
            (img.height - crop_h) / 2,
            crop_w,
            crop_h,
            0,
            0,
            iconSize.width,
            iconSize.height
        );
        empty = false;
    }

    makeWindow(e, "Icon: " + pid);

    inp.type = "file";
    inp.style.width = "250px";
    inp.style.padding = "0";
    inp.style.border = "0";
    inp.style.background = "transparent";
    inp.style.marginBottom = "10px";
    e.appendChild(element("div", inp));

    canvas.style.border = "1px solid black";
    canvas.width = iconSize.width;
    canvas.height = iconSize.height;
    e.appendChild(element("div", canvas));

    draw = canvas.getContext('2d');
    draw.fillText("no icon", 10, 10);

    inp.onchange = runLater(function () {
        if (inp.files.length < 1) { return; }
        var fr = new FileReader();
        fr.onload = function (ev) {
            runNow(function () {
                var img = element("img");
                img.onload = runLater(setImg, img);
                img.src = ev.target.result;
            });
        };
        fr.readAsDataURL(inp.files[0]);
    });

    e.appendChild(adminSaveButton("Change", function (showerror) {
        var p = getDb().page(pid), data;
        if (!p) {
            e.close_window();
            return;
        }
        if (empty) {
            data = "";
        } else {
            data = canvas.toDataURL("image/jpeg");
            if (data.substring(0, 23) !== "data:image/jpeg;base64,") {
                showerror("Could not encode JPEG image");
                return;
            }
            data = data.substring(23);
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
