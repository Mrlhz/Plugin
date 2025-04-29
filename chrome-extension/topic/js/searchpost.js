import { sleep } from './utils.js';

export function searchpost() {
  const link = document.querySelector("#profile_act > li.searchpost > a");
  const name = document.querySelector("#profilecontent > div.itemtitle.s_clear > h1");

  const href = link?.getAttribute('href') || ''

  return {
    url: href.startsWith('http') ? href || '' : `${window.location.origin}/${href}`,
    name: name.innerText || ''
  }
}

// window.open(searchpost().url, '_blank');
const origin = '';
export const searchposts = [].map(item => {
  return {
    ...item,
    url: `${origin}${item.url}}`
  }
});


export function hasUpdate() {

  const first = document.querySelector('.datatable tbody tr th>a');
  if (!first) {
    return false
  }

  return !first?.classList?.contains('downloaded');
}

export async function setClass({ storage }) {
  const links = [...document.querySelectorAll('a[href*="viewthread.php?tid="]')]
  for (const link of links) {
    const href = link.getAttribute('href')
    if (href && href.includes('&page=')) {
      continue
    }
    
    const { tid } = parseQuery(href.split('?')[1])
    if (storage[tid]) {
      // link.className = ''
      link.classList.add('downloaded')
    }
  }

  return 'complete'
}

function parseQuery(search = '') {
  const query = {}
  const searchParams = new URLSearchParams(search);

  for (const [key, value] of searchParams.entries()) {
    query[key] = value
  }
  return query
}

export async function create(tab) {
  const storage = await chrome.storage.local.get(null)

  await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: setClass, args: [{ storage }] });

  const result = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: hasUpdate, args: [] })
  .then(([{ documentId, frameId, result }]) => result)

  console.log(result);
  if (globalSet.has(tab.id) && !result) {
    await sleep(3500);
    await chrome.tabs.remove(tab.id);
  }

  globalSet.delete(tab.id);
}

export const globalSet = new Set();
export async function getPosts(options = {}) {
  const allTabs = await chrome.tabs.query({})

  // TODO配置成多选项
  for await (const post of searchposts.slice(3)) {
    const { url } = post
    if (!allTabs.includes(url)) {
      const tab = await chrome.tabs.create({ url });
      console.log({ tab }, globalSet);
      globalSet.add(tab.id)

      await sleep(6000);

    }
  }
}
