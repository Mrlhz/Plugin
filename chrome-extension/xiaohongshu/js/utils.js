
// fatkun-5.12.5
export function getAllBgImages(selectors) {
  var e
  var t = []
  var r = selectors
    ? document.getElementsByTagName("*")
    : document.querySelectorAll(selectors)
  for (r = t.slice.call(r, 0, r.length); r.length;) {
    e = deepCss(r.shift(), "background-image")
    if (e) {
      e = /url\(['"]?([^")]+)/.exec(e) || []
    }
    (e = e[1]) && !e.match(/:\/\//) && (e = e.match(/^\/\//) ? `${location.protocol}${e}`
    : e.match(/^\/[^/]/) ? `${location.protocol}//${location.host}${e}`
    : location.href.replace(/[^/]+$/, e)),
    e && -1 == t.indexOf(e) && (t[t.length] = e);
  }
  return t
}


function deepCss(ele, property) {
  if (!ele || !ele.style) return '';
  // background-image => backgroundImage
  const camelCaseKey = property.replace(/\-([a-z])/g, function (e, t) {
    return t.toUpperCase()
  });
  if (ele.currentStyle) {
    return ele.style[camelCaseKey] || ele.currentStyle[camelCaseKey] || ''
  };
  const w = document.defaultView || window;
  return ele.style[camelCaseKey] || w.getComputedStyle(ele, '').getPropertyValue(property) || ''
}

// https://developer.chrome.com/docs/extensions/reference/offscreen/#method-createDocument
let creating; // A global promise to avoid concurrency issues
export async function setupOffscreenDocument(path) {
  // Check all windows controlled by the service worker to see if one 
  // of them is the offscreen document with the given path
  // const offscreenUrl = chrome.runtime.getURL(path);
  const matchedClients = await clients.matchAll();
  
  if (matchedClients.some(item => item.url.includes('offscreen.html'))) {
    return
  }

  // create offscreen document
  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: '../offscreen.html',
      reasons: [chrome.offscreen.Reason.BLOBS],
      justification: 'reason for needing the document',
    });
    await creating;
    creating = null;
  }
}

/**
 * @description Node.js path.parse(pathString) ponyfill.
 * @link https://github.com/jbgutierrez/path-parse
 * @export
 * @param {*} pathString
 * @returns
 * {
 *   root : '/',
 *   dir : '/home/user/dir',
 *   base : 'file.txt',
 *   ext : '.txt',
 *   name : 'file'
 *  }
 */
export function pathParse(pathString) {
  if (typeof pathString !== 'string') {
    throw new TypeError("Parameter 'pathString' must be a string, not " + typeof pathString)
  }
  var allParts = win32SplitPath(pathString)
  if (!allParts || allParts.length !== 5) {
    throw new TypeError("Invalid path '" + pathString + "'")
  }
  return {
    root: allParts[1],
    dir: allParts[0] === allParts[1] ? allParts[0] : allParts[0].slice(0, -1),
    base: allParts[2],
    ext: allParts[4],
    name: allParts[3]
  }
  function win32SplitPath(filename) {
    const splitWindowsRe = /^(((?:[a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?[\\\/]?)(?:[^\\\/]*[\\\/])*)((\.{1,2}|[^\\\/]+?|)(\.[^.\/\\]*|))[\\\/]*$/;
    return splitWindowsRe.exec(filename).slice(1)
  }
}

export function safeFileName(str, replace = '-') {
  return str.replace(/[\\\/\:\*\?\"\<\>\|]/g, replace)
}

export function sleep(delay) {
  return new Promise(resolve => {
    setTimeout(resolve, delay)
  })
}
