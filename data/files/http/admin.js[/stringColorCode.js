
function stringColorCode(s) {
    "use strict";

    function hash() {
        var i, c, sum = 0, prod = 1;
        for (i = 0; i < s.length; i += 1) {
            c = s.charCodeAt(i);
            sum += c;
            prod = (prod * (c + 11)) % 1527827;
        }
        return (sum * 13 + prod * 4545) % 1000000;
    }

    function hsv2rgb(i) {
        i.h -= Math.floor(i.h);
        i.h *= 6.0;
        if (i.s < 0) { i.s = 0; }
        if (i.s > 1) { i.s = 1; }
        if (i.v < 0) { i.v = 0; }
        if (i.v > 1) { i.v = 1; }
        var f = i.h - Math.floor(i.h), r, g, b;
        switch (Math.floor(i.h)) {
        case 0:
            r = 1;
            g = 1 - (1 - f) * i.s;
            b = 1 - i.s;
            break;
        case 1:
            r = 1 - i.s * f;
            g = 1;
            b = 1 - i.s;
            break;
        case 2:
            r = 1 - i.s;
            g = 1;
            b = 1 - (1 - f) * i.s;
            break;
        case 3:
            r = 1 - i.s;
            g = 1 - i.s * f;
            b = 1;
            break;
        case 4:
            r = 1 - (1 - f) * i.s;
            g = 1 - i.s;
            b = 1;
            break;
        default:
            r = 1;
            g = 1 - i.s;
            b = 1 - i.s * f;
        }
        r *= i.v;
        g *= i.v;
        b *= i.v;
        return { r: r, g: g, b: b };
    }

    return (function () {
        var h = hash(s),
            hue = (h % 100) / 100,
            val = (Math.floor(h / 100) % 100) / 200,
            c = hsv2rgb({h: hue, s: 1, v: 1 - val});
        return "rgb(" + Math.round(c.r * 255) + "," +
            Math.round(c.g * 255) + "," + Math.round(c.b * 255) + ")";
    }());
}
