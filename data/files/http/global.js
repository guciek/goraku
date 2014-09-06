
var showError, onDbChanged, onPageChanged;

Array.prototype.forEach = function (f) {
    "use strict";
    var i, len = this.length;
    if (typeof f !== "function") {
        throw new TypeError();
    }
    for (i = 0; i < len; i += 1) {
        if (this.hasOwnProperty(i)) {  f(this[i], i);  }
    }
};

(function () {
    "use strict";

    function error(msg) {
        try {
            var e = document.createElement("div"),
                lc = document.getElementById("leftcolumn");
            e.textContent = "Error: " + msg;
            e.className = "jswarning";
            lc.insertBefore(e, lc.firstChild);
        } catch (err) {
            alert("Error: " + msg);
        }
    }

    function makeSet() {
        var es = [];
        return {
            add: function (e) {
                var i;
                for (i = 0; i < es.length; i += 1) {
                    if (es[i] === e) { return false; }
                }
                es.push(e);
                return true;
            },
            remove: function (e) {
                var i;
                for (i = 0; i < es.length; i += 1) {
                    if (es[i] === e) {
                        es.splice(i, 1);
                        return true;
                    }
                }
                return false;
            },
            removeAll: function () {
                es = [];
            },
            contains: function (e) {
                var i;
                for (i = 0; i < es.length; i += 1) {
                    if (es[i] === e) {
                        return true;
                    }
                }
                return false;
            },
            forEach: function (f) {
                var i, copy = [];
                for (i = 0; i < es.length; i += 1) {
                    copy.push(es[i]);
                }
                for (i = 0; i < copy.length; i += 1) {
                    f(copy[i]);
                }
            }
        };
    }

    function makeEvent() {
        var callbacks = makeSet();
        return {
            add: callbacks.add,
            remove: callbacks.remove,
            removeAll: callbacks.removeAll,
            fire: function (p1, p2, p3) {
                callbacks.forEach(function (callback) {
                    try {
                        callback(p1, p2, p3);
                    } catch (err) {
                        error(err);
                    }
                });
            }
        };
    }

    try {
        showError = error;
        onDbChanged = makeEvent();
        onPageChanged = makeEvent();
    } catch (err) {
        error(err);
    }
}());
