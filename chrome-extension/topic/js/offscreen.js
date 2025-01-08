
const BACKGROUND_TO_OFFSCREEN = 'BACKGROUND_TO_OFFSCREEN'
const BACKGROUND_TO_OFFSCREEN__SINGLE = 'BACKGROUND_TO_OFFSCREEN__SINGLE'
const OFFSCREEN_TO_BACKGROUND = 'OFFSCREEN_TO_BACKGROUND'
const OFFSCREEN_TO_BACKGROUND__SINGLE = 'OFFSCREEN_TO_BACKGROUND__SINGLE'
const TOPIC_KEY = 'topic'

const head = `
<head>
  <link rel="stylesheet" href="../../stylesheet/style_4_common.css">
  <link rel="stylesheet" href="../../stylesheet/scriptstyle_4_viewthread.css">
  <link rel="stylesheet" href="../../stylesheet/style_4_seditor.css">
  <link rel="stylesheet" href="../../stylesheet/style_4_special.css">
</head>`
const styles = `<style>.t_msgfontfix{width: 960px;}t</style>`

chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
  console.log('消息：', request, sender, sendResponse)
  const { cmd, result, options } = request
  if (cmd === BACKGROUND_TO_OFFSCREEN) {
    create(result, OFFSCREEN_TO_BACKGROUND)
  }
  if (cmd === BACKGROUND_TO_OFFSCREEN__SINGLE) {
    create(result, OFFSCREEN_TO_BACKGROUND__SINGLE, options)
  }
  sendResponse({ message: '我是 offscreen，已收到你的消息：', request })
})

async function create(result = [], cmd, options) {
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

    const { allPage } = options || {}
    const { author, authorLink, url: topicURL } = element
    let _text = text
    if (!allPage) {
      _text = insert(_text, makeAuthorHtml({ author, authorLink }))
    }

    const htmls = [_text]
    if (allPage) {
      htmls.unshift(head)
    } else {
      htmls.unshift(styles)
    }
    const div = document.createElement('div');
    div.innerHTML = htmls.join('\n\t');

    formatLink(div, topicURL);
    removeAds(div);
    removeScripts(div);
    removeAttributes(div);
    // TODO 改成配置选项
    updateAttribute(div);

    const html = div.innerHTML;
    const htmlBlob = new Blob([html], {
      type: "text/html"
    })
    const htmlBlobUrl = URL.createObjectURL(htmlBlob)
    element.htmlBlob = htmlBlobUrl
  }
  // return result

  await chrome.runtime.sendMessage({ cmd, result, options })
}


const default_images = [
  'attachimg.gif',   'back.gif',        'biggrin.gif',     'call.gif',
  'cry.gif',         'curse.gif',       'dafa.gif',
  'desktop.png',     'ding.png',        'ding_big2.png',
  'dizzy.gif',       'funk.gif',        'handshake.gif',
  'hb.gif',          'huacangku.gif',   'huffy.gif',
  'hug.gif',         'index.mjs',       'kiss.gif',
  'logo.png',        'lol.gif',         'loveliness.gif',
  'mad.gif',         'mobile.png',      'online_member.gif',
  'qq.gif',          'sad.gif',         'shocked.gif',
  'shutup.gif',      'shy.gif',         'sleepy.gif',
  'smile.gif',       'star_level1.gif', 'star_level2.gif',
  'star_level3.gif', 'sweat.gif',       'time.gif',
  'titter.gif',      'tongue.gif',      'userinfo.gif',
  'victory.gif',     '001.gif'
];
function updateAttribute(ele) {
  [...ele.querySelectorAll('img')].forEach(image => {
    const src = image.getAttribute('src')
    const { base } = pathParse(src)
    if (src && default_images.includes(base)) {
      image.setAttribute('src', `../../default_images/${base}`)
    } else if (src && !default_images.includes(base)) {
      image.setAttribute('src', `images/${base}`)
    }
  })
}

function removeAds(ele) {
  if (ele?.querySelector('#ad_thread1_0')) {
    ele.querySelector('#ad_thread1_0').outerHTML = ''
  }
}

function removeScripts(ele) {
  // 获取所有的 <script> 元素
  const scripts = ele?.querySelectorAll('script');
  scripts.forEach(script => {
    script?.parentNode.removeChild(script);
  });
}

function removeAttributes(ele) {
  const removeAttrs = ['onmouseover', 'onclick', 'onload'];
  // 获取所有的 <script> 元素
  const allTags = ele?.getElementsByTagName('*') || ele?.querySelectorAll('*');
  for (const element of allTags) {
    removeAttrs.forEach(attr => {
      if (element.getAttribute(attr)) {
        // image.setAttribute(attr, '')
        element.removeAttribute(attr)
      }
    })
  }
}

function formatLink(ele, url) {
  const { origin } = new URL(url);
  [...ele?.querySelectorAll('a')].forEach(link => {
    const href = link.getAttribute('href')
    if (href && !href.startsWith('http')) {
      link.setAttribute('href', `${origin}/${href}`)
      link.setAttribute('target', '_blank')
    }
  })
}

function makeAuthorHtml(info = {}) {
  const content = `<a href="${info.authorLink}" class="posterlink" target="_blank">${info.author}</a>`
  
  return [content, '<br>'].join('')
}

// 在头部插入作者信息
function insert(targetHtml = '', html) {
  const div = document.createElement('div')
  div.innerHTML = targetHtml
  const target = div.querySelector('.t_msgfontfix')
  if (!target) {
    return targetHtml
  }

  const newNode = document.createElement('p')
  newNode.innerHTML = html
  // 检查div是否有子节点，如果有，插入到第一个子节点之前
  if (target.firstChild) {
    target.insertBefore(newNode, target.firstChild);
  } else {
    target.appendChild(newNode);
  }

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
