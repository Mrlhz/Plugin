import { executeScript, wait, getSearchParams } from '../helper.js'
import { getWellList } from '../dom.js'

export async function getVideoBriefInfo({ currentTab }) {
  console.log({ currentTab })
  const [{ frameId, result }] = await executeScript(currentTab, getWellList)
  if (!Array.isArray(result)) {
    return
  }
  for (let i = 0, l = result.length; i < l; i++) {
    const item = result[i]
    const { title, href } = item
    const viewkey = getSearchParams(href).get('viewkey')
    if (!viewkey) {
      continue
    }
    const storageObj = await chrome.storage.local.get([viewkey])
    const storageItem = storageObj[viewkey] || {}
    // 将视频简要数据与原有数据合并--更新[title, href, author]
    const store = merge(item, storageItem)
    await chrome.storage.local.set({ [viewkey]: store })
  }
  console.log(result)
}

export function merge(newValue, oldValue) {
  let { title, href, author } = newValue
  title = title ? title : oldValue.title
  href = href ? href : oldValue.href
  author = author ? author : oldValue.author
  // ['author', 'downloadLink', 'downloaded', 'original', 'time', 'title', 'url']
  return { ...oldValue, title, href, author }
}
