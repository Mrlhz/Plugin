/**
 * @description 获取视频信息
 * @export
 * @returns {Object} 视频名称、下载链接、作者、发布时间
 */
export function getHtml() {
  console.log(arguments)
  let title = document.querySelector('#videodetails.videodetails-yakov .login_register_header')
  let time = document.querySelector('#videodetails-content .title-yakov')
  let author = document.querySelector('#videodetails-content .title-yakov .title')
  let download = [...document.querySelectorAll('.boxPart .floatmenu a')].filter(item => item.innerText.includes('下载'))
  title = title ? title.innerText.trim() : ''
  time = time ? time.innerText.trim() : ''
  author = author ? author.innerText.trim() : ''
  let downloadLink = download[0] ? download[0].getAttribute('href') : ''
  return { title, time, author, downloadLink }
}

/**
 * @description 获取视频列表
 * @export
 * @returns {Array} 视频列表
 */
export function getWellList() {
  let wellList = document.querySelectorAll('.well.well-sm')

  return Array.from(wellList).map(item => {
    let videoTitle = item.querySelector('.video-title')
    let link = item.querySelector('a')
    console.log(videoTitle, link)
    let href = link ? link.getAttribute('href') : ''
    let title = videoTitle ? videoTitle.innerText : ''
    return { title, href }
  })
}

export function getHdLink(...args) {
  console.log(arguments, args, this)
  try {
    const videodetails = document.querySelector('#videodetails-content')
    if (!videodetails) { return }
    const [hdLink] = [...videodetails.querySelectorAll('a')].filter(item => {
      return item && item.innerText && item.innerText.includes('高清')
    })

    if (hdLink) hdLink.click()
  } catch (e) {
    console.log(e)
    return
  }
}

export function pages() {
  let title = document.querySelector('#nav') // dom
  title = title ? title.innerText : '' // '91自拍论坛 » xxxx » 照片接龙~xxxx'
  title = title.split('»')[2] ? title.split('»')[2].trim() : '' // 照片接龙~xxxx
  let page = document.querySelectorAll('.pages')
  page = page.length === 1 ? page[0]: page[1]
  const pageList = [...page.querySelectorAll('a')]
    .filter(item => {
      return item.getAttribute('href') && !item.getAttribute('class')
    })
    .map(item => {
      const href = item.getAttribute('href') || ''
      const page = item.innerText.trim()
      return {
        title,
        saveTitle: `${page}-${title}`,
        url: href.includes('http') ? href : `${location.origin}/${href}`,
        page
      }
    })
  return pageList
}

export function setTitle({}) {
  try {
    function GetQueryString(name) {  
          var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");  
          var r = window.location.search.substr(1).match(reg);  //获取url中"?"符后的字符串并正则匹配
          var context = "";  
          if (r != null)  
               context = r[2];  
          reg = null;  
          r = null;  
          return context == null || context == "" || context == "undefined" ? "" : context;  
      }
      const page = GetQueryString('page')
      if (!/^\d+-/.test(document.title)) {
        document.title = `${page}-${document.title}`
      }
  } catch (e) {
    console.log(e)
    return
  }
}