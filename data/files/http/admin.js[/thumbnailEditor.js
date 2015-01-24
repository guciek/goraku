
function thumbnailEditor(img) {
    "use strict";

    var iconSize = { width: 145, height: 110 },
        e = element("div"),
        canvas = element("canvas"),
        draw = canvas.getContext("2d");

    function redraw() {
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
    }

    canvas.style.border = "1px solid black";
    canvas.width = iconSize.width;
    canvas.height = iconSize.height;
    e.appendChild(element("div", canvas));

    redraw();

    e.getBase64JPEG = function () {
        var data = canvas.toDataURL("image/jpeg");
        if ((data.substring(0, 23) !== "data:image/jpeg;base64,")
                || (data.length < 100)) {
            return "";
        }
        return data.substring(23);
    };

    return e;
}
