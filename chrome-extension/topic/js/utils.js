
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
  return str.replace(/[\\\/\:\：\*\?\"\<\>\|]/g, replace)
    .replaceAll('~', '')
    .replace(/\./g, '')
  // return str?.trim()
  //    ?.toLowerCase()
  //   .replace(/\s+/g, '-') // Replace whitespace with -
  //   .replace(/[\]\[\!\'\#\$\%\&\(\)\*\+\,\.\/\:\\<\=\>\?\@\\\^\_\{\|\}\~\`。，、；：？！…—·ˉ¨‘’“”々～‖∶＂＇｀｜〃〔〕〈〉《》「」『』．〖〗【】（）［］｛｝]/g, replace) // Remove known punctuators
  //   .replace(/^\-+/, '') // Remove leading -
  //   .replace(/\-+$/, '') // Remove trailing -
}

export function slug(str) {
  return (str || '').replace(/\./g, '')
}

export function sleep(delay) {
  return new Promise(resolve => {
    setTimeout(resolve, delay)
  })
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}

export function formatDate(t) {
  const date = new Date(t)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  return [year, month, day].map(formatNumber).join('-')
}

// https://github.com/vuejs/router/blob/main/packages/router/src/encoding.ts
export const PLUS_RE = /\+/g // %2B
export function decode(text) {
  try {
    return decodeURIComponent('' + text)
  } catch (err) {
    console.error(`Error decoding "${text}". Using original value`)
  }
  return '' + text
}

/**
 * @link https://github.com/vuejs/router/blob/main/packages/router/src/query.ts
 * @param {*} search 
 * @returns 
 */
export function parseQuery(search = '') {
  const query = {}
  // avoid creating an object with an empty key and empty value
  // because of split('&')
  if (search === '' || search === '?') return query
  const hasLeadingIM = search[0] === '?'
  const searchParams = (hasLeadingIM ? search.slice(1) : search).split('&')
  for (let i = 0; i < searchParams.length; ++i) {
    // pre decode the + into space
    const searchParam = searchParams[i].replace(PLUS_RE, ' ')
    // allow the = character
    const eqPos = searchParam.indexOf('=')
    const key = decode(eqPos < 0 ? searchParam : searchParam.slice(0, eqPos))
    const value = eqPos < 0 ? null : decode(searchParam.slice(eqPos + 1))

    if (key in query) {
      // an extra variable for ts types
      let currentValue = query[key]
      if (!isArray(currentValue)) {
        currentValue = query[key] = [currentValue]
      }
      // we force the modification
      ;currentValue.push(value)
    } else {
      query[key] = value
    }
  }
  return query
}
