import { pathParse, safeFileName, sleep, formatDate } from './utils.js'

// 批量下载
export async function batchDownload(tab) {
  const storage = await chrome.storage.local.get(tab.url)
  if (!storage) {
    return
  }

  const list = storage[tab.url]
  if (!Array.isArray(list)) {
    console.log('list null: ', list)
    return
  }
  const taskList = list
    .filter((item) => item && item.id)
    .map(({ id }) => chrome.storage.local.get(`https://www.xiaohongshu.com/explore/${id}`))
  const result = await Promise.all(taskList).then(res => res.flat(1).map(item => Object.values(item)[0]))
  console.log(result)

  const { nickname } = getUser(list[0])
  const listFileName = `${nickname}/${nickname}_list.json`
  const detailFileName = `${nickname}/${nickname}_deatil_list.json`
  const [r1, r2] = await pathExists([
    { filename: listFileName },
    { filename: detailFileName }
  ])
  if (!r1.exist) {
    await chrome.runtime.sendMessage({ cmd: 'background_to_offscreen__batch', result: list, filename: listFileName })
    await sleep(500)
  }
  if (!r2.exist) {
    await chrome.runtime.sendMessage({ cmd: 'background_to_offscreen__batch', result: result, filename: detailFileName })
  }

  const imagesList = []
  for (let index = 0, len = result.length; index < len; index++) {
    const note = result[index];
    if (!note) {
      console.log('continue', note)
      continue
    }
    try {
      // await downloadImageBatch(note)
      imagesList.push(...getSingleNoteImage(note))
      // await sleep(1500)
    } catch (error) {
      console.log(error, note, index)
    }
  }

  console.log({ imagesList })
  await downloadImageBatch(imagesList)
}

export async function downloadImageBatch(list) {
  if (!Array.isArray(list)) {
    console.log('fail: ', list)
    return
  }

  const res = await pathExists(list)
  const filterList = res.filter(({ exist }) => !exist)
  console.log(filterList)

  while(filterList.length) {
    const items = filterList.splice(0, 2)
    const tasks = items.map(({ url, filename }) => {
      return chrome.downloads.download({ url, filename }).then(downloadId => {
        return { downloadId }
      })
    })
    await Promise.allSettled(tasks)
    await sleep(2000)
  }
}

function getSingleNoteImage(note) {
  const { user, title, imageList, time, noteId } = note
  const { nickname } = user
  if (!Array.isArray(imageList)) {
    return []
  }
  const list = imageList.map((image, i) => {
    const { infoList } = image
    const infoItem = infoList.filter(item => item.imageScene === 'CRD_WM_WEBP')[0] || {}

    const { url } = infoItem
    const { name, ext, base } = url.includes('!') ? pathParse(url.split('!')[0]) : pathParse(url)
    const safeTitle = `${safeFileName(title)}-${formatDate(time)}__${noteId}`
    return {
      url,
      // 创建标题文件夹单独存放
      // filename: ext ? `${nickname}/${safeTitle}/${base}` : `${nickname}/${safeTitle}/${name}.jpg`
      // 存放到用户名文件夹
      filename: ext ? `${nickname}/${safeTitle}-${i + 1}${ext}` : `${nickname}/${safeTitle}-${i + 1}.jpg`
    }
  })

  return list
}

// offscreen_to_background__batch
export function batchDownloadJSONFile({ url, note }) {
  if (!note) {
    console.log('download json file fail:', note)
    return
  }
  const { user, title } = note
  const { nickname } = user
  const filePath = `${nickname}/${safeFileName(title)}`
  const filename = `${filePath}.json`
  chrome.downloads.download({ url: url, filename }).then(downloadId => {
    return { downloadId }
  })
}

// 有filename
export function downloadJSONFile({ url, note, filename }) {
  if (!note || !filename) {
    console.log('download json file fail:', note, filename)
    return
  }
  chrome.downloads.download({ url: url, filename }).then(downloadId => {
    return { downloadId }
  })
}



function getUser(noteItem = {}) {
  const { noteCard } = noteItem || {}
  const { user } = noteCard || {}
  return user
}

function fs(method, ...args) {
  const body = {
    method,
    params: args
  }
  return fetch('http://localhost:3005/avmoo/fs', {
    method: 'post',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(res => res.json())
}

// pathExists([{ url: '', filename: 'D:\\Downloads\\xiaohongshu\\戴眼镜的小陈\\白色口罩为什么那么有纯净感？！-4.jpg' }])
function pathExists(list = []) {
  const body = { list }
  return fetch('http://localhost:3005/avmoo/fs/pathExists', {
    method: 'post',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(res => res.json())
    .catch((error) => {
      console.log(error)
      return list
    })
}
