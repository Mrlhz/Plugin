
const BACKGROUND_TO_OFFSCREEN = 'BACKGROUND_TO_OFFSCREEN'
const BACKGROUND_TO_OFFSCREEN__SINGLE = 'BACKGROUND_TO_OFFSCREEN__SINGLE'
const OFFSCREEN_TO_BACKGROUND = 'OFFSCREEN_TO_BACKGROUND'
const OFFSCREEN_TO_BACKGROUND__SINGLE = 'OFFSCREEN_TO_BACKGROUND__SINGLE'
const TOPIC_KEY = 'topic'

chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
  console.log('消息：', request, sender, sendResponse)
  const { cmd, result } = request
  if (cmd === BACKGROUND_TO_OFFSCREEN) {
    const res = create(result, OFFSCREEN_TO_BACKGROUND)
  }
  if (cmd === BACKGROUND_TO_OFFSCREEN__SINGLE) {
    const res = create(result, OFFSCREEN_TO_BACKGROUND__SINGLE)
  }
  sendResponse({ message: '我是 offscreen，已收到你的消息：', request })
})

async function create(result = [], cmd) {
  for (let index = 0; index < result.length; index++) {
    const element = result[index];
    const text = element[TOPIC_KEY]
    const blob = new Blob([text], {
      // type: "text/plain"
      // type: "application/json"
      type: "text/markdown"
    })
    const url = URL.createObjectURL(blob)

    element.blob = url

    // TODO 改成配置选项
    const html = updateAttribute(text)
    const htmlBlob = new Blob([html], {
      type: "text/html"
    })
    const htmlBlobUrl = URL.createObjectURL(htmlBlob)
    element.htmlBlob = htmlBlobUrl
  }
  // return result

  await chrome.runtime.sendMessage({ cmd, result })
}


const i = ['attachimg.gif', 'back.gif']
const styles = `<style>.t_msgfontfix{width: 960px;}t</style>`
function updateAttribute(html) {

  const div = document.createElement('div')
  div.innerHTML = [styles, html].join('\n\t');

  [...div.querySelectorAll('img')].forEach(image => {
    const src = image.getAttribute('src')
    const { base } = pathParse(src)
    if (src && !i.includes(base)) {
      image.setAttribute('src', `images/${base}`)
    }

    const removeAttrs = ['onmouseover'];
    removeAttrs.forEach(attr => {
      if (image.getAttribute(attr)) {
        // image.setAttribute(attr, '')
        image.removeAttribute(attr)
      }
    })
  })

  return div.innerHTML
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
function pathParse(pathString) {
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
