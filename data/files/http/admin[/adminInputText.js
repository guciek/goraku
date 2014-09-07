
function adminInputText(action) {
    "use strict";

    var e = element("input");

    e.type = "text";

    if (action) {
        e.onkeypress = function (ev) {
            ev = ev || window.event;
            var c = ev.which || ev.keyCode;
            if (c !== 13) { return true; }
            try {
                action();
            } catch (err) {
                showError(err);
            }
            if (ev) { ev.preventDefault(); }
            return false;
        };
    }

    return e;
}
