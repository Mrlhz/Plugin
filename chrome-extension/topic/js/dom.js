// import { getAllBgImages } from './utils.js'

export function getTopicDetail(options) {
  const { tid, page, allPage } = options || {}
  const title = document.querySelector('#threadtitle h1')?.innerText
    || document.querySelector('#nav')?.innerText?.split('» ').at(-1)
    || '';

  let topicDom = '';
  if (allPage) {
    topicDom = document.getElementById('wrap')
  } else {
    topicDom = document.querySelector('.t_msgfontfix')
      || document.querySelector('.postmessage.firstpost')
      || document.querySelector('.defaultpost');
  }
  
  // 无权限
  if (!topicDom) {
    return {
      title: document.title,
      topic: topicDom?.outerHTML,
      url: window.location.href
    }
  }

  const authorDom = document.querySelector('.authorinfo .posterlink')
  const author = authorDom?.innerText?.trim() || '';
  const space = authorDom?.getAttribute('href') || '';
  const authorLink = space.startsWith('http') ? space : `${window.location.origin}/${space}`;

  const images = [...topicDom?.querySelectorAll('img')]
    .map(image => {
      return image.getAttribute('src')
    })
    .filter(src => src.startsWith('http'));

  return {
    title,
    topic: topicDom?.outerHTML,
    author,
    authorLink,
    images,
    url: window.location.href,
    tid,
    page
  }

}
