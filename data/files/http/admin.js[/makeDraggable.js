
function makeDraggable(subject) {
    "use strict";

    var onstart = makeEvent(),
        onmove = makeEvent(),
        onend = makeEvent(),
        is_dragging = false,
        x = -1000,
        y = -1000;

    function checkmoved(e, fireevent) {
        e = e || window.event;
        if (!e) { return false; }
        try { e.preventDefault(); } catch (ignore) {}
        if (e.changedTouches &&
                (e.changedTouches.length >= 1)) {
            e = e.changedTouches[0];
        }
        if (!e.pageX) { return; }
        if (!e.pageY) { return; }
        var dx = e.pageX - x,
            dy = e.pageY - y;
        if ((dx === 0) && (dy === 0)) { return; }
        x = e.pageX;
        y = e.pageY;
        if (fireevent) {
            onmove.fire({x: x, y: y, dx: dx, dy: dy});
        }
    }

    function move(e) {
        checkmoved(e, true);
        return false;
    }

    function end(e) {
        checkmoved(e, true);
        if (is_dragging) {
            is_dragging = false;
            document.removeEventListener('mousemove', move, false);
            document.removeEventListener('mouseup', end, false);
            document.removeEventListener('touchmove', move, false);
            document.removeEventListener('touchend', end, false);
            onend.fire();
        }
        return false;
    }

    function start(e) {
        try { e.preventDefault(); } catch (ignore) {}
        if (!is_dragging) {
            checkmoved(e, false);
            is_dragging = true;
            document.addEventListener('mousemove', move, false);
            document.addEventListener('mouseup', end, false);
            document.addEventListener('touchmove', move, false);
            document.addEventListener('touchend', end, false);
            onstart.fire({x: x, y: y});
        }
        return false;
    }

    subject.addEventListener('mousedown', start, false);
    subject.addEventListener('touchstart', start, false);

    return {
        onstart: onstart,
        onmove: onmove,
        onend: onend,
        clean: function () {
            end();
            onstart.removeAll();
            onmove.removeAll();
            onend.removeAll();
            subject.removeEventListener('mousedown', start, false);
            subject.removeEventListener('touchstart', start, false);
        }
    };
}
