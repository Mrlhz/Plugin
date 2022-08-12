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
    const { title, url } = item
    const viewkey = getSearchParams(url).get('viewkey')
    if (!viewkey) {
      continue
    }
    const storageObj = await chrome.storage.local.get([viewkey])
    const storageItem = storageObj[viewkey] || {}
    // 获取[title, url, author]基本信息
    const baseInfo = getBasicInfo(item, storageItem)
    await chrome.storage.local.set({ [viewkey]: { ...storageItem, ...baseInfo }  })
  }
  console.log(result)
}

export function getBasicInfo(newValue, oldValue) {
  let { title, url, author } = newValue
  title = title ? title : oldValue.title
  url = url ? url : oldValue.url
  author = author ? author : oldValue.author
  // ['author', 'downloadLink', 'downloaded', 'original', 'time', 'title', 'url']
  return { title, url, author }
}
