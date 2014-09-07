
function adminIsDeletePossible(pid) {
    "use strict";

    var p = getDb().page(pid),
        empty = true;

    if (!p) { return false; }

    if (pid === "index") { return false; }

    p.forEachChild(function () { empty = false; });

    p.forEachFile(function () { empty = false; });

    return empty;
}
