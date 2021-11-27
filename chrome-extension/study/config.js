
export const cacheName = 'my-cache'

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
    if (hdLink) {
      hdLink.click()
    }
    console.log('click')
  } catch (e) {
    console.log(e)
    return
  }
}
