
function adminWindowPageList() {
    "use strict";

    var list = element("div"),
        e = element("div", list);

    makeWindow(e, "Page List");

    e.style.minWidth = "200px";
    e.style.minHeight = "100px";
    e.style.width = "300px";
    e.style.height = "150px";
    e.style.overflow = "scroll";
    e.style.resize = "both";
    e.style.background = "#fff";

    function pageOptions(p) {
        var s = element("span", p.id());
        s.style.fontWeight = "bold";
        if (p.prop("type")) {
            s.style.color = stringColorCode(p.prop("type"));
        }
        s = element("span", s);
        p.forEachProp(function (k) {
            if (k.substring(0, 6) !== "title_") { return; }
            k = k.substring(6);
            s.appendChild(adminLink(
                " " + k,
                function () {
                    onPageChanged.fire(p.id() + "/" + k);
                }
            ));
        });
        s.appendChild(adminLink(
            " [edit]",
            function () { adminWindowPageEdit(p.id()); }
        ));
        return s;
    }

    function dbChanged() {
        var parent, lines = {};
        list.textContent = "";
        getDb().forEachPage(function (p) {
            lines[p.id()] = element("div", pageOptions(p));
        });
        Object.keys(lines).forEach(function (l) {
            parent = getDb().page(l).parent();
            if (parent) {
                lines[parent.id()].appendChild(lines[l]);
                lines[l].style.marginLeft = "30px";
            } else {
                list.appendChild(lines[l]);
                lines[l].style.marginBottom = "20px";
            }
        });
    }

    onDbChanged.add(dbChanged);

    e.onclose = function () {
        onDbChanged.remove(dbChanged);
    };

    dbChanged();
}
