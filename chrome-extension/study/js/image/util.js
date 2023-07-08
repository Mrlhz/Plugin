
// fatkun-5.12.5
function getAllBgImages() {
  var e, t = [],
    r = document.getElementsByTagName("*");
  for (r = t.slice.call(r, 0, r.length); r.length;)(e = deepCss(r.shift(), "background-image")) && (e = /url\(['"]?([^")]+)/.exec(e) || []), (e = e[1]) && !e.match(/:\/\//) && (e = e.match(/^\/\//) ? location.protocol + e : e.match(/^\/[^/]/) ? location.protocol + "//" + location.host + e : location.href.replace(/[^/]+$/, e)), e && -1 == t.indexOf(e) && (t[t.length] = e);
  return t
}


function deepCss(ele, t) {
  if (!ele || !ele.style) return "";
  var r = t.replace(/\-([a-z])/g, function (e, t) {
    return t.toUpperCase()
  });
  if (ele.currentStyle) return ele.style[r] || ele.currentStyle[r] || "";
  var n = document.defaultView || window;
  return ele.style[r] || n.getComputedStyle(ele, "").getPropertyValue(t) || ""
}
