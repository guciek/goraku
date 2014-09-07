
function makeWindow(content, title, notCloseable) {
    "use strict";

    var windowParent = $("windowParent"),
        removed = false,
        bar = element("div", title),
        close = element("div", "X"),
        inner = element("div", content),
        w = element("div"),
        drag;

    function onfocus() {
        try {
            close.style.background = "#666";
            bar.style.background = "#666";
            inner.style.border = "2px solid #666";
            inner.style.borderTop = "none";
            windowParent.nextZindex += 1;
            w.style.zIndex = windowParent.nextZindex;
            if (content.onfocus) { content.onfocus(); }
        } catch (err) {
            showError(err);
        }
    }

    function onblur() {
        try {
            close.style.background = "#aaa";
            bar.style.background = "#aaa";
            inner.style.border = "2px solid #aaa";
            inner.style.borderTop = "none";
            if (content.onblur) { content.onblur(); }
        } catch (err) {
            showError(err);
        }
    }

    function onactivate() {
        if (w !== windowParent.focusedWindow) {
            if (windowParent.focusedWindow) {
                windowParent.focusedWindow.onblur();
            }
            windowParent.focusedWindow = w;
            w.onfocus();
        }
        return true;
    }

    function bounds() {
        var x = parseInt(w.style.left, 10),
            y = parseInt(w.style.top, 10);
        if (window.innerWidth && window.innerHeight) {
            if (x + 10 > window.innerWidth) {
                x = window.innerWidth - 10;
            }
            if (y + 35 > window.innerHeight) {
                y =  window.innerHeight - 35;
            }
        }
        if (x < 10) { x = 10; }
        if (y < 10) { y = 10; }
        w.style.left = x + 'px';
        w.style.top = y + 'px';
    }

    function closewindow() {
        if (removed) { return; }
        removed = true;
        try {
            if (windowParent.focusedWindow === w) {
                w.onblur();
                windowParent.focusedWindow = null;
            }
            w.parentNode.removeChild(w);
            drag.clean();
            if (content.onclose) { content.onclose(); }
        } catch (err) {
            showError(err);
        }
    }

    if (!windowParent) {
        windowParent = element("div");
        windowParent.id = "windowParent";
        windowParent.style.position = "absolute";
        windowParent.style.left = "0px";
        windowParent.style.top = "0px";
        windowParent.style.width = "100%";
        windowParent.style.zIndex = 1000;
        windowParent.nextZindex = 100;
        document.body.appendChild(windowParent);
    }

    bar.style.overflow = "hidden";
    bar.style.background = "#666";
    bar.style.lineHeight = "24px";
    bar.style.color = "white";
    bar.style.fontSize = "13px";
    bar.style.textAlign = "center";
    bar.style.position = "relative";
    bar.style.height = "24px";
    bar.style.cursor = "move";

    if (!notCloseable) {
        close.style.position = "absolute";
        close.style.top = close.style.right = "0px";
        close.style.width = close.style.height = "24px";
        close.style.fontWeight = "bold";
        close.style.cursor = "pointer";
        close.style.background = "#666";
        close.onclick = closewindow;
        close.onmousedown = function (event) {
            event.stopPropagation();
        };
        bar.appendChild(close);
    }

    content.style.padding = "10px 10px";
    content.close_window = closewindow;

    content.set_x = function (v) {
        w.style.left = v + 'px';
        bounds();
    };

    content.set_y = function (v) {
        w.style.top = v + 'px';
        bounds();
    };

    inner.style.border = "2px solid #666";
    inner.style.borderTop = "none";
    inner.style.background = "#eee";
    inner.style.overflow = "hidden";
    inner.style.minWidth = "200px";

    w.style.position = "fixed";
    w.style.border = "1px solid #ccc";
    w.onfocus = onfocus;
    w.onblur = onblur;

    w.appendChild(bar);
    w.appendChild(inner);

    w.get_x = content.get_x = function () {
        return parseInt(w.style.left, 10);
    };

    w.get_y = content.get_y = function () {
        return parseInt(w.style.top, 10);
    };

    if (windowParent.focusedWindow) {
        w.style.left = (windowParent.focusedWindow.get_x() + 20) + "px";
        w.style.top = (windowParent.focusedWindow.get_y() + 20) + "px";
        windowParent.focusedWindow.onblur();
    } else {
        w.style.left = "50px";
        w.style.top = "50px";
    }
    windowParent.focusedWindow = w;
    w.onfocus();
    bounds();

    w.addEventListener('mousedown', onactivate, false);
    w.addEventListener('touchstart', onactivate, false);

    drag = makeDraggable(bar);

    drag.onmove.add(function (e) {
        content.set_x(content.get_x() + e.dx);
        content.set_y(content.get_y() + e.dy);
        bounds();
    });

    drag.onend.add(function () {
        if (content.ondragend) { content.ondragend(); }
    });

    windowParent.appendChild(w);
}
