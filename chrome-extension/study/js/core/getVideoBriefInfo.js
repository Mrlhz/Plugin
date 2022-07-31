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
    const storageItem = await chrome.storage.local.get([viewkey])
    if (!storageItem[viewkey]) {
      await chrome.storage.local.set({ [viewkey]: item })
    }
  }
  console.log(result)
}
