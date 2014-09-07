
function adminWindowPageDelete(pid) {
    "use strict";

    var e = element("div", "Are you sure you want to delete the page '" +
        pid + "'?");

    if (!adminIsDeletePossible(pid)) { return; }

    makeWindow(e, "Delete: " + pid);

    e.appendChild(adminSaveButton("Delete", function (showerror) {
        var p = getDb().page(pid);
        if (!p) {
            e.close_window();
            return;
        }
        p.remove(function (err) {
            if (err) {
                showerror(err);
            } else {
                e.close_window();
            }
        });
    }));

    function dbChanged() {
        if (!adminIsDeletePossible(pid)) {
            e.close_window();
        }
    }

    onDbChanged.add(dbChanged);

    e.onclose = function () {
        onDbChanged.remove(dbChanged);
    };

    dbChanged();
}
