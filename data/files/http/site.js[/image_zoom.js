
(function () {
    "use strict";

    var zoomedImage;

    function animateFadeIn(e) {
        var opacity = 0.01;
        function step() {
            opacity += 0.1;
            if (opacity > 0.9) {
                e.style.opacity = 1;
            } else {
                setTimeout(step, 25);
                e.style.opacity = opacity;
            }
        }
        setTimeout(step, 25);
        e.style.opacity = opacity;
    }

    function displayPopup(popup, img) {
        var w = img.width,
            h = img.height,
            win_w = window.innerWidth ||
                document.documentElement.clientWidth,
            win_h = window.innerHeight ||
                document.documentElement.clientHeight,
            scale = 1;
        if ((w < 2) || (h < 2)) {
            return;
        }
        if ((win_w - 40) / w < scale) {
            scale = (win_w - 40) / w;
        }
        if ((win_h - 40) / h < scale) {
            scale = (win_h - 40) / h;
        }
        w = Math.round(scale * w);
        h = Math.round(scale * h);
        img.style.border = "0";
        img.style.padding = "0";
        img.style.margin = "0";
        popup.appendChild(img);
        popup.style.position = "fixed";
        popup.style.padding = "10px";
        popup.style.margin = "0";
        popup.style.background = "#000";
        popup.style.width = img.style.width = w + "px";
        popup.style.height = img.style.height = h + "px";
        popup.style.left = Math.round((win_w - w - 20) / 2) + "px";
        popup.style.top = Math.round((win_h - h - 20) / 2) + "px";
        animateFadeIn(popup);
    }

    function upgradeLink(a) {
        var href = String(a.getAttribute("href")),
            ext = href.substring(href.length - 4);
        if (href.substring(0, 6) !== "/file/") {
            return;
        }
        if ((ext !== ".jpg") && (ext !== ".png")) {
            return;
        }
        clickable(a, function () {
            if (!zoomedImage) {
                zoomedImage = element("div");
                document.body.appendChild(zoomedImage);
            }
            var newimg = element("img"),
                popup = element("div");
            zoomedImage.textContent = "";
            zoomedImage.appendChild(popup);
            newimg.onload = runLater(displayPopup, popup, newimg);
            clickable(newimg, function () {
                zoomedImage.textContent = "";
            });
            newimg.src = href;
        });
    }

    function processArticleLinks() {
        var i, as = $("article").getElementsByTagName("a");
        for (i = 0; i < as.length; i += 1) {
            upgradeLink(as[i]);
        }
    }

    runNow(function () {
        onArticleLoaded.add(processArticleLinks);
        onPageChanged.add(function () {
            if (zoomedImage) {
                zoomedImage.textContent = "";
            }
        });
    });
}());
