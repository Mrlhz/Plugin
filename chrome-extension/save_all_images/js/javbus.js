// [].map.call(document.getElementsByTagName('img'), function(img){
//   return img.src
// })


// https://zhuanlan.zhihu.com/p/76237595

// 用chrome插件下载文件，并自定义文件名
// https://blog.csdn.net/force2002/article/details/8731406

// https://github.com/jbgutierrez/path-parse
const splitWindowsRe =
    /^(((?:[a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?[\\\/]?)(?:[^\\\/]*[\\\/])*)((\.{1,2}|[^\\\/]+?|)(\.[^.\/\\]*|))[\\\/]*$/;

function win32SplitPath(filename) {
  return splitWindowsRe.exec(filename).slice(1)
}

function parse(pathString) {
  const allParts = win32SplitPath(pathString)
  return { base: allParts[2], ext: allParts[4], name: allParts[3] }
}

// 获取HTML内容
function getHtml() {
  const map = { 0: 'av', 1: 'release_date', 2: 'length' }
  // 识别码 发行时间 时间长度
  const info = Array.from(document.querySelectorAll('.info p')).reduce((acc, cur, index) => {
    const text = cur.innerText
    const key = map[index]
    if (key) {
      acc[key] = text.split(': ')[1] ? text.split(': ')[1].trim() : ''
    }
    return acc
  }, {})

  const images = Array.from(document.querySelectorAll('#sample-waterfall a.sample-box')).map(item => ({ url: item.getAttribute('href') }))
  const cover = document.querySelector('.bigImage img')
  images.push({ ...getCoverFile(cover, info), cover: true })
  return { info, images }
}

// 获取到的图片添加到指定目录 
function parseHtml({ info, images } = {}) {
  const output = `${info.av}/`
  const result = images.map(item => {
    if (item.filename) {
      item.filename = output + item.filename
    } else {
      item.filename = `${output}${parse(item.url).base}`
    }
    return item
  })
  return result
}

// 获取封面图
function getCoverFile(element, info) {
  if (!element || !info) return
  let src = element.getAttribute('src')
  let url = src.includes('http') ? src : `${location.origin}${src}`
  return {
    url,
    filename: info.av ? `${info.av}${parse(url).ext}` : ''
  }
}

function init() {
  const html = getHtml()
  const data = parseHtml(html)
  return data
}

init()

// location.pathname.replace('/', '')