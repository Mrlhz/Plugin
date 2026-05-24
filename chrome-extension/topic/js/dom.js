// import { getAllBgImages } from './utils.js'

export function getTopicDetail(options) {
  const { tid, page, allPage } = options || {}
  const title = document.querySelector('#threadtitle h1')?.innerText
    || document.querySelector('#nav')?.innerText?.split('» ').at(-1)
    || '';

  let topicDom = '';
  if (allPage) {
    topicDom = document.getElementById('wrap')?.cloneNode(true);
  } else {
    topicDom = document.querySelector('.t_msgfontfix')?.cloneNode(true)
      || document.querySelector('.postmessage.firstpost')?.cloneNode(true)
      || document.querySelector('.defaultpost')?.cloneNode(true);
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
      const src = image.getAttribute('src');
      if (src.endsWith('none.gif') && image.getAttribute('file')) {
        return image.getAttribute('file');
      }
      return src;
    })
    .filter(src => src.startsWith('http'));
  
  const topic = allPage ? document.querySelector("#nav").outerHTML + topicDom?.outerHTML : topicDom?.outerHTML;
  // console.log('topic', topic);

  return {
    title,
    topic,
    author,
    authorLink,
    images,
    url: window.location.href,
    tid,
    page
  }
}

export function getSearchpost() {
  const link = document.querySelector("#profile_act > li.searchpost > a");
  const name = document.querySelector("#profilecontent > div.itemtitle.s_clear > h1");

  const href = link?.getAttribute('href') || '';
  const url = href.startsWith('http') ? href : `${window.location.origin}/${href}`

  return {
    name: name.innerText || '',
    original: url,
    url: href.startsWith('/') ? href : `/${href}`
  }
}
