
function adminSaveButton(title, action) {
    "use strict";

    var line = element("div"),
        status = element("div"),
        subm;

    function input_submit(tit, action) {
        var active = true, e = element("input");
        e.type = "submit";
        e.value = String(tit);
        clickable(e, function () {
            if (active) {
                active = false;
                e.style.cursor = "default";
                try { e.style.opacity = 0.5; } catch (ignore) {}
                action(function () {
                    active = true;
                    e.style.cursor = "pointer";
                    try { e.style.opacity = 1; } catch (ignore) {}
                });
            }
        });
        return e;
    }

    subm = input_submit(title, function (reactivate) {
        status.textContent = "Working...";
        status.style.color = "#555";
        action(function (err) {
            reactivate();
            if (err) {
                status.textContent = "Error: " + err;
                status.style.color = "#f00";
            } else {
                status.textContent = "";
            }
        });
    });

    subm.style.display = "inline-block";
    subm.style.verticalAlign = "middle";

    line.appendChild(subm);

    status = element("div");
    status.style.display = "inline-block";
    status.style.verticalAlign = "middle";
    status.style.maxWidth = "250px";
    status.style.overflow = "hidden";
    status.style.marginLeft = "20px";

    line.style.marginTop = "10px";
    line.appendChild(status);

    return line;
}
