
function adminWindowMain() {
    "use strict";

    var e = element("div"),
        curPage = "";

    makeWindow(e, "Administration", true);

    e.style.width = "300px";

    function update() {
        e.textContent = "";
        e.appendChild(element("div", adminLink(
            "Open Page List",
            adminWindowPageList
        )));
        var path = curPage.split("/"), p, d;
        if (path.length !== 2) { return; }
        if (path[0].length < 1) { return; }
        p = getDb().page(path[0]);
        if (!p) { return; }
        d = element("div", adminLink(
            "Edit Current Page: " + p.id(),
            function () { adminWindowPageEdit(p.id()); }
        ));
        d.style.marginTop = "10px";
        e.appendChild(d);
    }

    function pgChanged(newPage) {
        if (newPage) { curPage = newPage; }
        update();
    }

    onDbChanged.add(update);
    onPageChanged.add(pgChanged);
    update();
}
