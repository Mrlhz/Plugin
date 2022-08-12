
export function executeScript(tab, func, params = ['task']) {
  return new Promise(resolve => {
    chrome.scripting.executeScript({ target: { tabId: tab.id }, func: func, args: params }, (...args) => {
      console.log('args', args)
      resolve(...args)
    })
  })
}

export async function getLocalStorage(viewkey) {
  const storageItem = await chrome.storage.local.get(viewkey)
  return storageItem[viewkey] || {}
}

export const wait = (delay = 0) => new Promise(resolve => { setTimeout(resolve, delay) })

export async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true }
  let [tab] = await chrome.tabs.query(queryOptions)
  return tab
}

export async function getAllWindow() {
  let queryOptions = {}
  let tabs = await chrome.tabs.query(queryOptions)
  return tabs
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
    .replace(/~/g, '')
}

/**
 * @description webp图片格式转化为jpg
 * @param {string} filename 
 * @returns {string} filename
 * @example
 * convertToJPG('1.webp')
 * => '1.jpg'
 */
export function convertToJPG(filename) {
  const { ext, name } = pathParse(filename)

  if (['.webp'].includes(ext.toLocaleLowerCase())) {
    return `${name}.jpg`
  }
  return filename
}

/**
 * @description 处理 URL 的查询字符串
 * @reference https://developer.mozilla.org/zh-CN/docs/Web/API/URLSearchParams
 * @param {*} href 
 * @returns {URLSearchParams} URLSearchParams instance
 * @example
 * const params = getSearchParams('https://example.com?foo=1&bar=2')
 * => params.get('foo') === '1'
 */
export function getSearchParams(href) {
  try {
    const url = new URL(href)
    const { search } = url
    return new URLSearchParams(search.slice(1))
  } catch (e) {
    console.log(e)
    return new URLSearchParams('')
  }
}
