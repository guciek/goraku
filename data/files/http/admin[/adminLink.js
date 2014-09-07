
function adminLink(tit, action) {
    "use strict";

    var e = element("span", tit);

    e.style.color = "#005";
    e.style.cursor = "pointer";

    e.onmouseout = function () {
        e.style.color = "#005";
    };

    e.onmouseover = function () {
        e.style.color = "#55a";
    };

    return clickable(e, action);
}
