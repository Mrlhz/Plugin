import { executeScript, wait, getSearchParams } from '../helper.js'
import { getWellList } from '../dom.js'

export async function getVideoBriefInfo(currentTab) {
  console.log({ currentTab })
  const [documentItem] = await executeScript(currentTab, getWellList)
  const { result } = documentItem

  if (!Array.isArray(result)) {
    return
  }
  for (let i = 0, l = result.length; i < l; i++) {
    const { title, href } = result[i]
    console.log(result[i])
    const viewkey = getSearchParams(href).get('viewkey')
    if (!viewkey) {
      continue
    }
    const storageItem = await chrome.storage.local.get([viewkey])
    if (!storageItem[viewkey]) {
      await chrome.storage.local.set({ [viewkey]: { title, href } })
    }
  }
  console.log(result)
}
