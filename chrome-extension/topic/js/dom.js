// import { getAllBgImages } from './utils.js'

export function getTopicDetail(options) {
  const { tid } = options
  const title = document.querySelector('#threadtitle h1')?.innerText || '';
  const topicDom = document.querySelector('.t_msgfontfix')
                || document.querySelector('.postmessage.firstpost')
                || document.querySelector('.defaultpost');
  // 无权限
  if (!topicDom) {
    return {
      title: document.title,
      topic: topicDom?.outerHTML,
      url: window.location.href
    }
  }

  const author = document.querySelector('.authorinfo .posterlink')?.innerText?.trim() || '';

  const images = [...topicDom?.querySelectorAll('img')]
    .map(image => {
      return image.getAttribute('src')
    })
    .filter(src => src.startsWith('http'));

  return {
    title,
    topic: topicDom?.outerHTML,
    author,
    images,
    url: window.location.href,
    tid
  }

}
