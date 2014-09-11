
function cleanHtml(inputHtml, imgBase) {
    "use strict";

    var writeText, writeWhitespace, block, inline;

    function cutbetween(str, start, end) {
        var p, p2;
        p = str.indexOf(start, 2);
        if (p < 0) { return ""; }
        p += start.length;
        p2 = str.indexOf(end, p);
        if (p2 < 0) { return ""; }
        return str.substring(p, p2);
    }

    function tagWriter(write, inner) {
        var t = "";
        function tclose() {
            var k, cc;
            if (inner && inner.close) { inner.close(); }
            if (t !== "") {
                write('</');
                for (k = 0; k < t.length; k += 1) {
                    cc = t.charAt(k);
                    if (cc.match(/\s/)) { break; }
                    write(cc);
                }
                write('>');
                t = "";
            }
        }
        function topen(newt) {
            tclose();
            if (newt !== "") {
                write('<' + newt + '>');
                t = newt;
            }
        }
        return {
            open: topen,
            close: tclose,
            opened: function () { return t; }
        };
    }

    function ontag_a(tag) {
        var p, p2, href;
        p = tag.indexOf('href="', 2);
        if (p < 0) { return; }
        p += 6;
        p2 = tag.indexOf('"', p);
        if (p2 < 0) { p2 = tag.length; }
        href = tag.substring(p, p2);
        if ((href.charAt(0) === '/') ||
                (href.substring(0, 7) === 'http://') ||
                (href.substring(0, 8) === 'https://')) {
            inline.want('a href="' + href + '"');
        }
    }

    function ontag_img(tag) {
        var src = cutbetween(tag, 'src="', '"'),
            alt = cutbetween(tag, 'alt="', '"');
        if (!src) {
            return;
        }
        if (!alt) {
            alt = "[img]";
        }
        if (src.substring(0, 5) !== "data:") {
            src = src.split("/");
            src = src[src.length - 1];
            src = imgBase + src;
        }
        block.want("p");
        inline.want("");
        writeWhitespace(" ");
        writeText('<img src="' + src + '" alt="' + alt + '" />');
        writeWhitespace(" ");
    }

    function ontag(originaltag) {
        var tag = originaltag.trim().toLowerCase();
        tag = tag.split(" ")[0];
        tag = tag.split("\t")[0];
        if (tag.charAt(0) === '/') {
            inline.want("");
            return;
        }
        tag = tag.split("/")[0];
        if (tag === "img") {
            ontag_img(originaltag);
            return;
        }
        if (tag === "div") {
            tag = "p";
        }
        if ((tag === "p") || (tag === "pre") ||
                (tag === "h1") || (tag === "h2")) {
            block.want(tag);
            inline.want("");
            if ((tag === "pre") && (block.opened() === "pre")) {
                writeText("<br />");
            } else {
                block.close();
            }
        }
        if (tag === "br") {
            if (block.opened() === "pre") {
                writeText("<br />");
            } else {
                block.close();
            }
        }
        if (block.wanted() !== "p") { return; }
        if ((tag === "b") || (tag === "strong")) {
            inline.want("b");
        }
        if (tag === "i") {
            inline.want("i");
        }
        if (tag === "sup") {
            inline.want("sup");
        }
        if (tag === "a") {
            ontag_a(originaltag);
        }
    }

    function onamp(a) {
        a = a.toLowerCase();
        if (a === "nbsp") {
            writeWhitespace(" ");
        } else if (a.match(/^[a-z0-9#]+$/)) {
            writeText("&" + a + ";");
        }
    }

    function onchar(c) {
        if (c === '"') {
            writeText('&quot;');
        } else if (c === "'") {
            writeText('&#39;');
        } else if (c === "\\") {
            writeText('&#92;');
        } else if (c === "&") {
            writeText('&amp;');
        } else if (c.match(/\s/)) {
            writeWhitespace(c);
        } else {
            writeText(c);
        }
    }

    function do_parse() {
        var i = 0, find, c, h = inputHtml.split("\n").join("<br />");
        while (i < h.length) {
            c = h.charAt(i);
            i += 1;
            if (c === '<') {
                find = h.indexOf('>', i);
                if (find < 0) { break; }
                ontag(h.substring(i, find));
                i = find + 1;
            } else if (c === '&') {
                find = h.indexOf(';', i);
                if (find < 0) { break; }
                onamp(h.substring(i, find));
                i = find + 1;
            } else if (c !== '>') {
                onchar(c);
            }
        }
    }

    return (function () {
        var result = "",
            wanted_inline = "",
            wanted_block = "p",
            whitespace_last = true,
            whitespace_buffered = 0,
            lastTextWasImage = false;
        function result_append(s) {
            result += s;
        }
        inline = tagWriter(result_append);
        block = tagWriter(result_append, inline);
        block.want = function (t) {
            wanted_block = String(t);
            if (wanted_block.length < 1) { wanted_block = "p"; }
        };
        block.wanted = function () {
            return wanted_block;
        };
        inline.want = function (t) {
            wanted_inline = String(t);
        };
        inline.wanted = function () {
            return wanted_inline;
        };
        writeText = function (s) {
            s = String(s).trim();
            if (s.length < 1) { return; }
            if ((s.substring(0, 4) === "<img") && (!lastTextWasImage)) {
                block.close();
            }
            if (block.opened() !== wanted_block) {
                block.open(wanted_block);
                whitespace_last = (wanted_block !== "pre");
                whitespace_buffered = 0;
            }
            if (inline.opened() !== wanted_inline) {
                inline.close();
            }
            if (s.substring(0, 3) === "<br") {
                whitespace_buffered = 0;
            }
            if ((!whitespace_last) && (whitespace_buffered > 0)) {
                whitespace_last = true;
                while (whitespace_buffered > 0) {
                    whitespace_buffered -= 1;
                    result_append(" ");
                    if (block.opened() !== "pre") {
                        whitespace_buffered = 0;
                    }
                }
            }
            if (inline.opened() !== wanted_inline) {
                inline.open(wanted_inline);
            }
            result_append(s);
            lastTextWasImage = (s.substring(0, 4) === "<img");
            whitespace_last = false;
        };
        writeWhitespace = function (s) {
            if (s.charCodeAt(0) === 9) {
                whitespace_buffered += 4;
            } else {
                whitespace_buffered += 1;
            }
        };
        do_parse();
        block.close();
        return result;
    }());
}
