
function thumbnailEditor(img) {
    "use strict";

    var iconSize = { x: 145, y: 110 },
        imgSize = { x: img.width, y: img.height },
        pos = { x: imgSize.x / 2, y: imgSize.y / 2 },
        scale = { min: 1, max: 1, cur: 1 },
        e = element("div"),
        zoom = element("div"),
        canvas = element("canvas"),
        draw = canvas.getContext("2d"),
        drag = makeDraggable(canvas);

    canvas.style.border = "1px solid black";
    canvas.style.cursor = "move";
    canvas.width = iconSize.x;
    canvas.height = iconSize.y;
    e.appendChild(element("div", canvas));
    e.appendChild(zoom);

    if (imgSize.x * iconSize.y > iconSize.x * imgSize.y) {
        scale.max = imgSize.y / iconSize.y;
    } else {
        scale.max = imgSize.x / iconSize.x;
    }
    if (scale.max < 1) {
        scale.min = scale.max;
    }
    scale.cur = scale.max;

    function redraw() {
        draw.fillStyle = "#fff";
        draw.fillRect(0, 0, iconSize.x, iconSize.y);
        if (scale.cur === 1) {
            draw.drawImage(
                img,
                -Math.round(pos.x - iconSize.x / 2),
                -Math.round(pos.y - iconSize.y / 2)
            );
        } else {
            draw.drawImage(
                img,
                pos.x - iconSize.x * scale.cur / 2,
                pos.y - iconSize.y * scale.cur / 2,
                iconSize.x * scale.cur,
                iconSize.y * scale.cur,
                0,
                0,
                iconSize.x,
                iconSize.y
            );
        }
    }

    redraw();

    drag.onmove.add(function (ev) {
        pos.x -= ev.dx * scale.cur;
        pos.y -= ev.dy * scale.cur;
        function clamp(v) {
            if (pos[v] < iconSize[v] * scale.cur / 2) {
                pos[v] = iconSize[v] * scale.cur / 2;
            }
            if (pos[v] > imgSize[v] - iconSize[v] * scale.cur / 2) {
                pos[v] = imgSize[v] - iconSize[v] * scale.cur / 2;
            }
        }
        clamp("x");
        clamp("y");
        redraw();
    });

    function addZoomButton(label, factor) {
        var d = element("input");
        d.type = "submit";
        d.value = label;
        d.style.display = "inline-block";
        d.style.fontWeight = "bold";
        d.style.margin = "10px 10px 0 0";
        zoom.appendChild(d);
        clickable(d, function () {
            scale.cur *= factor;
            if (scale.cur < scale.min) {
                scale.cur = scale.min;
            }
            if (scale.cur > scale.max) {
                scale.cur = scale.max;
            }
            drag.onmove.fire({dx: 0, dy: 0});
        });
    }
    addZoomButton("+", 0.8);
    addZoomButton("-", 1.2);

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
