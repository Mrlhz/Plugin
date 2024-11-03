import { executeScript, pathParse } from '../helper.js'
import { getAvatarList, getMovieDetail } from '../dom.js'
import { pathExists } from '../pathExists.js'

export async function downloadMovieImageList({ currentTab }) {
  const [{ frameId, result = [] }] = await executeScript(currentTab, getMovieDetail, [])
  const { av, star, images } = result
  console.log(result)
  const filePath = Array.isArray(star) && star.length === 1 ? `${star[0].name}` : 'avatar'

  // TODO: 封面下载不了
  const filterFlag = true
  const _images = filterFlag ? images.filter(item => !item.cover): images;

  const dImages = _images.map(item => {
    const { name, url } = item
    const filename = _images.length === 1 ? `${filePath}/${name}` : `${filePath}/${av}/${name}`
    return { url, filename }
  })

  const fImages = await pathExists(dImages)

  const tasks = fImages.map(item => {
    const { url, filename } = item
    return chrome.downloads.download({ url, filename }).then(downloadId => {
      return { av, ...item, downloadId }
    })
  })
  const res = await Promise.all(tasks)
  console.log(res)
  return result
}

export async function downloadStarAvatarList({ currentTab }) {
  const [{ frameId, result = [] }] = await executeScript(currentTab, getAvatarList, [])
  console.log(result)
  const filePath = 'avatar/avatars'
  const tasks = result.map(item => {
    const { avatar, name } = item
    const { ext } = pathParse(avatar.url)
    const file = `${name}${ext}`
    const filename = `${filePath}/${file}`
    return chrome.downloads.download({ url: avatar.url, filename }).then(downloadId => {
      return { file, ...item, downloadId }
    })
  })
  const res = await Promise.all(tasks)
  console.log(res)
}

// https://developer.chrome.com/docs/extensions/reference/offscreen/#method-createDocument
let creating; // A global promise to avoid concurrency issues
export async function setupOffscreenDocument(path) {
  // Check all windows controlled by the service worker to see if one 
  // of them is the offscreen document with the given path
  // const offscreenUrl = chrome.runtime.getURL(path);
  const matchedClients = await clients.matchAll();
  
  if (matchedClients.some(item => item.url.includes('offscreen.html'))) {
    return
  }

  // create offscreen document
  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: '../../offscreen.html',
      reasons: [chrome.offscreen.Reason.BLOBS],
      justification: 'reason for needing the document',
    });
    await creating;
    creating = null;
  }
}
