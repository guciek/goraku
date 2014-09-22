
(function () {
    "use strict";

    var loggedUser;

    function input_text(action) {
        var e = element("input");
        e.type = "text";
        if (action) {
            e.onkeypress = function (ev) {
                ev = ev || window.event;
                var c = ev.which || ev.keyCode;
                if (c !== 13) { return true; }
                runNow(action);
                if (ev) { ev.preventDefault(); }
                return false;
            };
        }
        return e;
    }

    function animateFadeOutRemove(e) {
        var opacity = 1;
        function step() {
            opacity -= 0.03;
            if (opacity <= 0.05) {
                e.parentNode.removeChild(e);
            } else {
                setTimeout(step, 25);
                e.style.opacity = opacity;
            }
        }
        setTimeout(step, 25);
    }

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

    function postRequest(url, data, onresponse) {
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

    function addLabel(b, label) {
        var p = element("p", label + ":");
        p.appendChild(element("br"));
        p.appendChild(b);
        return p;
    }

    function loginFailedMsg(msg) {
        var e = element("div", msg || "Login failed");
        e.className = "jswarning";
        $("leftcolumn").appendChild(e);
        setTimeout(function () {
            animateFadeOutRemove(e);
        }, 3000);
    }

    function addContentLogin() {
        var user, pass, submit;
        $("title_text").textContent = "Login";
        if (loggedUser) {
            $("article").appendChild(
                element("p", "You are now logged in as '" + loggedUser + "'.")
            );
            return;
        }
        submit = input_submit("Login", function (reactivate) {
            var u = user.value, p = pass.value;
            postRequest(
                "/login",
                u + ":" + p,
                function (d, err) {
                    if ((d !== "OK") && (d !== "ADMIN")) {
                        loginFailedMsg(err);
                        reactivate();
                        user.value = "";
                        pass.value = "";
                        return;
                    }
                    loggedUser = u;
                    $("article").textContent = "";
                    $("article").appendChild(
                        element("p", "You are now logged in as '" + u + "'.")
                    );
                    if (d === "ADMIN") {
                        var e = element("script");
                        e.src = "/file/admin.js";
                        document.body.appendChild(e);
                    }
                }
            );
        });
        user = input_text(submit.onclick);
        user.style.width = "40%";
        pass = input_text(submit.onclick);
        pass.type = "password";
        pass.style.width = "40%";
        $("article").appendChild(addLabel(user, "User"));
        $("article").appendChild(addLabel(pass, "Password"));
        $("article").appendChild(element("p", submit));
    }

    function onUpdate() {
        if (getPage() === "login") {
            addContentLogin();
        }
    }

    runNow(function () {
        $("footer").appendChild(clickable(
            element("span", "login"),
            function () {
                onPageChanged.fire("login");
            }
        ));
        onDbChanged.add(onUpdate);
        onPageChanged.add(onUpdate);
    });
}());
