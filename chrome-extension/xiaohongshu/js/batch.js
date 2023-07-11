import { pathParse, safeFileName, sleep } from './utils.js'

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
  const taskList = list.map(({ id }) => chrome.storage.local.get(`https://www.xiaohongshu.com/explore/${id}`))
  const result = await Promise.all(taskList).then(res => res.flat(1).map(item => Object.values(item)[0]))
  console.log(result)

  const { nickName } = getUser(list[0])
  await chrome.runtime.sendMessage({ cmd: 'background_to_offscreen__batch', result: list, filename: `${nickName}/${nickName}_list.json` })
  await sleep(500)
  await chrome.runtime.sendMessage({ cmd: 'background_to_offscreen__batch', result: result, filename: `${nickName}/${nickName}_deatil_list.json` })

  for (let index = 0, len = result.length; index < len; index++) {
    const note = result[index];
    if (note) {
      await downloadImageBatch(note)
      await sleep(1500)
    }
  }
}

export async function downloadImageBatch(note) {
  if (!note || typeof note !== 'object') {
    console.log('fail: ', note)
    return
  } 
  const { user, title, imageList } = note
  const { nickname } = user
  const list = imageList.map((image, i) => {
    const url = `https://sns-img-qc.xhscdn.com/${image.traceId}`
    const { name, ext, base } = pathParse(url)
    const safeTitle = safeFileName(title)
    return {
      url,
      // 创建标题文件夹单独存放
      // filename: ext ? `${nickname}/${safeTitle}/${base}` : `${nickname}/${safeTitle}/${name}.jpg`
      // 存放到用户名文件夹
      filename: ext ? `${nickname}/${safeTitle}-${i + 1}${ext}` : `${nickname}/${safeTitle}-${i + 1}.jpg`
    }
  })
  // const tasks = list.map(({ url, filename }) => {
  //   return chrome.downloads.download({ url, filename }).then(downloadId => {
  //     return { downloadId }
  //   })
  // })
  // return Promise.allSettled(tasks)
  for (let index = 0; index < list.length; index++) {
    const { url, filename } = list[index];
    await chrome.downloads.download({ url, filename }).then(downloadId => {
      return { downloadId }
    })
    await sleep(1500)
    
  }
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