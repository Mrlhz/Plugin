/**
 * @description 获取视频信息
 * @export
 * @returns {Object} 视频名称、下载链接、作者、发布时间
 */
export function getVideoDetailsHtml() {
  let title = document.querySelector('#videodetails.videodetails-yakov .login_register_header')
  let time = document.querySelector('#videodetails-content .title-yakov')
  let author = document.querySelector('#videodetails-content .title-yakov .title')
  let download = [...document.querySelectorAll('.boxPart .floatmenu a')].filter(item => item.innerText.includes('下载'))
  title = title ? title.innerText.trim() : ''
  time = time ? time.innerText.trim() : ''
  author = author ? author.innerText.trim() : ''
  let downloadLink = download[0] ? download[0].getAttribute('href') : ''
  console.log(`91/[${author}]-${title}-${time}`)
  return { title, time, author, downloadLink, url: location.href }
}

/**
 * @description 获取视频列表
 * @export
 * @returns {Array} 视频列表
 */
export function getWellList() {
  let wellList = document.querySelectorAll('.well.well-sm')
  // 通过作者视频列表页面 或者推荐视频列表 取作者名
  const getHeaderAuthor = () => {
    const authorEl = document.querySelector('.login_register_header')
    const headerAuthor = authorEl ? authorEl.innerText.split(' ')[0] : ''
    return headerAuthor === '我关注用户的视频' ? '' : headerAuthor
  }

  // 通过 我关注用户的视频 页面获取作者名
  const keyWord = '作者:'
  const findAuthor = (array) => {
    const authorItem = array.find(v => v.includes(keyWord))
    return authorItem ? authorItem.split(' ')[1] || '' : ''
  }
  const getListAuthor = (wellItem) => {
    const fullText = wellItem.innerText
    const author = fullText.includes(keyWord) ? findAuthor(fullText.split('\n')) : ''
    return author || ''
  }

  return Array.from(wellList).map(item => {
    let videoTitle = item.querySelector('.video-title')
    let link = item.querySelector('a')
    let href = link ? link.getAttribute('href') : ''
    let title = videoTitle ? videoTitle.innerText || '' : ''
    title = title.replace('[原创]', '').trim()
    const author = getListAuthor(item) || getHeaderAuthor()
    return { title, href, author }
  })
}

export function getHdLink(...args) {
  console.log(arguments, args, this)
  try {
    const videodetails = document.querySelector('#videodetails-content')
    if (location.href.includes('view_video_hd')) return // HD
    if (!videodetails) { return }
    const [hdLink] = [...videodetails.querySelectorAll('a')].filter(item => {
      return item && item.innerText && item.innerText.includes('高清')
    })

    if (hdLink) hdLink.click()
    return !!hdLink
  } catch (e) {
    console.log(e)
    return false
  }
}

export function pages() {
  let title = document.querySelector('#nav') // dom
  title = title ? title.innerText : '' // 'xx1xx » xx2xx » xx3xx'
  title = title.split('»')[2] ? title.split('»')[2].trim() : '' // xx3xx
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
    const params = new URLSearchParams(location.search)
    const page = params.get('page')
    if (!/^\d+-/.test(document.title)) {
      document.title = `${page}-${document.title}`
    }
  } catch (e) {
    console.log(e)
    return
  }
}

/**
 * @description 收藏的演员
 *
 * @returns []
 */
export function getAvatarList() {
  return [...document.querySelectorAll('.avatar-box')]
    .map(item => {
      const photoFrame = item.querySelector('.photo-frame img')
      const src = photoFrame.getAttribute('src')
      const name = photoFrame.getAttribute('title')
      const type = item.querySelector('.photo-info .mleft .btn').innerText
      const href = item.getAttribute('href')
      return {
        name,
        type,
        href,
        avatar: {
          name,
          url: src.includes('http') ? src : location.origin + src
        }
      }
    })
    // .filter(item => !['nowprinting.gif'].includes(item.avatar.url))
    .filter(item => !item.avatar.url.includes('nowprinting.gif'))
}

export function getMovieDetail() {
  function getHtml() {
    // 1. 标题
    const title = document.querySelector('.container h3')
    // 2. 封面
    let screencap = document.querySelector('.screencap img')
    screencap = screencap ? screencap.getAttribute('src') : ''
    // 3. 磁力链接
    const magnet = Array.from(document.querySelectorAll('#magnet-table tr')).map((item) => {
      const magnet = [...item.querySelectorAll('td')].reduce((acc, cur, index) => {
        const keyMap = ['', 'size', 'date']
        if (index === 0) {
          acc['name'] = cur.innerText
          acc['link'] = cur.querySelector('a') ? cur.querySelector('a').getAttribute('href') : ''
        } else {
          const key = keyMap[index];
          acc[key] = cur.querySelector('a') ? cur.querySelector('a').innerText : ''
        }
        return acc
      }, {})
      return magnet
    }).filter((link) => link.link)
    // 4. 样品图像
    const images = Array.from(document.querySelectorAll('#sample-waterfall a.sample-box')).map((item) => {
      const url = item.getAttribute('href') // https://pics.dmm.co.jp/digital/video/h_1100hzgb00025/h_1100hzgb00025jp-1.jpg
      const start = url.lastIndexOf('/')
      const photo_frame = item.querySelector('.photo-frame img')
      const { origin } = location
      return {
        name: url.substring(start + 1), // h_1100hzgb00025jp-1.jpg
        url: url.includes('http') ? url: `${origin}${url}`,
        sample: photo_frame ? photo_frame.getAttribute('src') : ''
      }
    })
    // info
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
      if (key) acc[key] = text.split(': ')[1] ? text.split(': ')[1].trim() : text.split(': ')[1]
      return acc
    }, {})
    // 导演 制作商 发行商 系列
    const getBase = (url, key) => { return /https?/.test(url) ? url.split(key)[1] : '' }
    const info = Object.keys(infoMap).reduce((acc, cur) => {
      const selector = document.querySelector(`a[href*="${cur}"]`) // e.g <a href="https://www.busjav.fun/director/ka">xxxx</a>
      if (selector) {
        const key = infoMap[cur] // director
        const url = selector.getAttribute('href')
        acc[key] = {
          name: selector.innerText, // xxxx
          url,
          base: getBase(url, cur) // getBase('https://www.busjav.fun/director/xx', '/director/') => xx
        }
      }
      return acc
    }, {})
    // 类别
    const genre = [...document.querySelectorAll('a[href*="/genre/"')].map((item) => item.innerText)
    if (info1.av) {
      const extname = (file) => {
        const start = file.lastIndexOf('.')
        return file.substring(start)
      }
      images.push({
        name: `${info1.av}${extname(screencap)}`,
        url: screencap && screencap.includes('http') ? screencap : location.origin + screencap,
      })
    }
    // 演员
    const star = [...document.querySelectorAll('.genre a[href*="/star/"')].map((item) => {
      const url = item.getAttribute('href')
      return {
        name: item.innerText,
        url,
        base: getBase(url, '/star/')
      }
    })
  
    return {
      title: title ? title.innerText : '',
      star,
      url: location.href,
      screencap, // 封面
      magnet,
      images, // 样品图像 sampleImages
      genre,
      ...info,
      ...info1,
      idols: ''
    }
  }
  return getHtml()
}
