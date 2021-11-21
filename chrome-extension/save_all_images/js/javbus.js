// [].map.call(document.getElementsByTagName('img'), function(img){
//   return img.src
// })


// https://zhuanlan.zhihu.com/p/76237595

// 用chrome插件下载文件，并自定义文件名
// https://blog.csdn.net/force2002/article/details/8731406

const map = { 0: 'av', 1: 'release_date', 2: 'length' }
const infoMap = {
  '/director/': 'director',
  '/studio/': 'studio', // 制作商
  '/label/': 'label', // 发行商
  '/series/': 'series', // 系列
  // '/genre/': 'genre'
}
// 识别码 发行时间 时间长度
const info1 = Array.from(document.querySelectorAll('.info p')).reduce((acc, cur, index) => {
  const text = cur.innerText
  const key = map[index]
  if (key) {
    acc[key] = text.split(': ')[1] ? text.split(': ')[1].trim() : ''
  }
  return acc
}, {})

function init() {
  const images = Array.from(document.querySelectorAll('#sample-waterfall a.sample-box')).map(item => ({ url: item.getAttribute('href') }))
  const cover = document.querySelector('.bigImage img')
  images.push(getFile(cover))
  return images
}

const extname = (file) => {
  const start = file.lastIndexOf('.')
  return file.substring(start)
}

function getFile(element) {
  if (element) {
    let src = element.getAttribute('src')
    let url = src.includes('http') ? src : `${location.origin}${src}`
    return {
      url,
      filename: info1.av ? `${info1.av}/${info1.av}${extname(url)}` : ''
    }
  }
  return 
}

init()


// location.pathname.replace('/', '')