// import { getAllBgImages } from './utils.js'

export function getTopicDetail() {

  const title = document.querySelector('#threadtitle h1')?.innerText || '';
  const topicDom = document.querySelector('.t_msgfontfix')
                || document.querySelector('.postmessage.firstpost');
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
    images
  }

}
