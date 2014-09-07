
function adminInputSelect() {
    "use strict";

    var e = element("select");

    e.addoption = function (value, label, selected) {
        var opt = element("option");
        value = String(value);
        opt.value = value;
        opt.text = label || value;
        if (selected) {
            opt.selected = "selected";
        }
        e.appendChild(opt);
    };

    return e;
}
