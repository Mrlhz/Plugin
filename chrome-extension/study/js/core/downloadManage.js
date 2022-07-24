import { executeScript, pathParse } from '../helper.js'
import { getAvatarList, getMovieDetail } from '../dom.js'

export async function downloadMovieImageList({ currentTab }) {
  const [{ frameId, result = [] }] = await executeScript(currentTab, getMovieDetail, [])
  const { av, images } = result
  console.log(result)
  const filePath = 'avatar'
  const tasks = images.map(item => {
    const { name, url } = item
    const filename = images.length === 1 ? `${filePath}/${name}` : `${filePath}/${av}/${name}`
    return chrome.downloads.download({ url, filename }).then(downloadId => {
      return { av, ...item, downloadId }
    })
  })
  const res = await Promise.all(tasks)
  console.log(res)
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
