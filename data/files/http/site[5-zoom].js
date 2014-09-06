
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

    function makeImageZoomable(img) {
        if (img.onclick) {
            return;
        }
        if (!zoomedImage) {
            zoomedImage = element("div");
            document.body.appendChild(zoomedImage);
        }
        function displayPopup(popup, newimg) {
            var w = newimg.width,
                h = newimg.height,
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
            newimg.style.border = "0";
            newimg.style.padding = "0";
            newimg.style.margin = "0";
            popup.appendChild(newimg);
            popup.style.position = "fixed";
            popup.style.padding = "10px";
            popup.style.margin = "0";
            popup.style.background = "#000";
            popup.style.width = newimg.style.width = w + "px";
            popup.style.height = newimg.style.height = h + "px";
            popup.style.left = Math.round((win_w - w - 20) / 2) + "px";
            popup.style.top = Math.round((win_h - h - 20) / 2) + "px";
            animateFadeIn(popup);
        }
        img.onmouseover = function () {
            img.style.opacity = 0.6;
        };
        img.onmouseout = function () {
            img.style.opacity = 1;
        };
        clickable(img, function () {
            var newimg = element("img"),
                popup = element("div");
            zoomedImage.textContent = "";
            zoomedImage.appendChild(popup);
            newimg.onload = function () {
                try {
                    displayPopup(popup, newimg);
                } catch (err) {
                    showError(err);
                }
            };
            clickable(newimg, function () {
                zoomedImage.textContent = "";
            });
            newimg.src = img.src;
        });
    }

    function upgradeImage(img) {
        var iconSize = { width: 145, height: 110 };
        if (img.alt === "[zoom]") {
            img.style.maxWidth = iconSize.width + "px";
            img.style.maxHeight = iconSize.height + "px";
            makeImageZoomable(img);
        }
    }

    function processArticleImages() {
        var i, imgs = $("article").getElementsByTagName("img");
        for (i = 0; i < imgs.length; i += 1) {
            upgradeImage(imgs[i]);
        }
    }

    try {
        onArticleLoaded.add(processArticleImages);
        onPageChanged.add(function () {
            if (zoomedImage) {
                zoomedImage.textContent = "";
            }
        });
    } catch (err) {
        showError(err);
    }
}());
