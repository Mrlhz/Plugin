// import { getAllBgImages } from './utils.js'

export function getTopicDetail() {

  const title = document.querySelector('#threadtitle h1')?.innerText || '';
  const topic = document.querySelector('.t_msgfontfix')?.outerHTML;
  const author = document.querySelector('.authorinfo .posterlink')?.innerText?.trim() || '';

  const images = [...document.querySelectorAll('.t_msgfontfix img')]
    .map(image => {
      return image.getAttribute('src')
    })
    .filter(src => src.startsWith('http'));

  return {
    title,
    topic,
    author,
    images
  }

}