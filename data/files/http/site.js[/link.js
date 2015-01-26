
(function () {
    "use strict";

    onPageChanged.add(function () {
        var p, path = getPage(), link;
        if (!path) { return; }
        path = path.split("/");
        if (path.length !== 2) { return; }
        p = getDb().page(path[0]);
        if (!p) { return; }
        link = p.prop("link");
        if (link) {
            window.location = link;
        }
    });
}());
