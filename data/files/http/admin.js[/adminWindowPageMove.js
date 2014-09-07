
function adminWindowPageMove(pid) {
    "use strict";

    var panel = element("div"),
        e = element("div", panel),
        select;

    function isGoodParent(parent) {
        var i;
        if (!parent) { return false; }
        for (i = 0; i < 10; i += 1) {
            if (parent.id() === pid) { return false; }
            parent = parent.parent();
            if (!parent) { break; }
        }
        if (!parent) { return true; }
        return false;
    }

    function dbChanged() {
        var p, curparent;
        p = getDb().page(pid);
        if (!p) { e.close_window(); return; }
        curparent = p.parent();
        if (curparent) {
            curparent = curparent.id();
        } else {
            curparent = "";
        }
        if (select) {
            panel.removeChild(select);
        }
        select = adminInputSelect();
        select.addoption("", "<no parent>", curparent === "");
        getDb().forEachPage(function (parent) {
            if (!isGoodParent(parent)) { return; }
            select.addoption(parent.id(), parent.id(),
                curparent === parent.id());
        });
        panel.appendChild(select);
        select.style.width = "300px";
    }

    makeWindow(e, "Move: " + pid);

    e.appendChild(adminSaveButton("Move", function (showerror) {
        var p = getDb().page(pid), parent = String(select.value);
        if (!p) { e.close_window(); return; }
        if (parent && (!isGoodParent(getDb().page(parent)))) {
            showerror("Invalid choice");
            return;
        }
        p.writeProps({"parent": parent}, function (err) {
            if (err) {
                showerror(err);
            } else {
                e.close_window();
            }
        });
    }));

    onDbChanged.add(dbChanged);

    e.onclose = function () {
        onDbChanged.remove(dbChanged);
    };

    dbChanged();
}
