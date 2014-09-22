
(function () {
    "use strict";

    function getCookie(n) {
        n = n + "=";
        var s = String(document.cookie),
            p = s.indexOf(n);
        if (p < 0) { return ""; }
        s = s.substring(p + n.length);
        p = s.indexOf(";");
        if (p >= 0) {
            s = s.substring(0, p);
        }
        return s;
    }

    var lockedSID = getCookie("SID");

    function postRequest(url, data, onresponse) {
        if (lockedSID.length < 10) {
            throw "Invalid SID format";
        }
        if (String(document.cookie).indexOf("SID=" + lockedSID) < 0) {
            onresponse("", "The session has expired. You must log in again");
            return;
        }
        var req = new XMLHttpRequest();
        req.open("POST", url, true);
        req.setRequestHeader("Content-Type", "application/octet-stream");
        req.onreadystatechange = runLater(function () {
            if (req.readyState < 4) {
                return;
            }
            if (req.status === 200) {
                onresponse(String(req.responseText));
            } else if (req.status) {
                onresponse("", "HTTP code " + req.status);
            } else {
                onresponse("", "HTTP error");
            }
        });
        req.send(data);
    }

    function init() {
        var w = element("div", "Loading database...");
        makeWindow(w, "Administration", true);
        w.style.width = "300px";
        postRequest(
            "/admin/getdb",
            "getdb;" + String(new Date().getTime()),
            function (d) {
                if ((d.length < 1) || (d[0] !== "{")) {
                    w.textContent = "Error: Could not load database!" +
                        (d ? " (" + d + ")" : "");
                    w.style.color = "#f00";
                    return;
                }
                d = eval("(" + d + ")");
                if (!d) {
                    w.textContent = "Error: Invalid database data!";
                    w.style.color = "#f00";
                    return;
                }
                w.close_window();
                onDbChanged.fire(adminDbWrapper(d, postRequest));
                adminWindowMain();
            }
        );
    }

    runNow(init);
}());
