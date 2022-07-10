import { convertToJPG } from './helper.js'

let url = 'http://localhost:3005/avmoo/movie';
// url = 'http://localhost:3005/avmoo/custom'

const starInputEl = document.getElementById('starInput')

document.querySelector('#requestBtn').addEventListener('click', (e) => {
  // getImagesList({ 'idols': '水卜さくら' })
  const inputValue = starInputEl ? starInputEl.value.trim() : ''
  if (inputValue) {
    getImagesList({ 'idols': inputValue })
  }
})

async function getImagesList(params) {
  const { data } = await axios.get(url, { params })
  const exists = await fsManage('pathExists', 'F:\\Downloads')
  console.log(data)
  if (exists) {
    await download(data.images)
  }
  if (!exists) {
    console.log({ msg: 'F:\\Downloads not exist' } )
  }
}

async function download(data = []) {
  const result = []
  for (let index = 0, l = data.length; index < l; index++) {
    const item = data[index]
    const { av, name, url, dest } = item 
    const filename = `${dest}/${convertToJPG(name)}`
    const downloadItem = await chrome.downloads.download({ url, filename }).then(downloadId => {
      return { av, ...item, downloadId }
    })
    result.push(downloadItem)
  }
  console.log(result)

  return
  const tasks = data.slice(0).map(item => {
    const { av, name, url, dest } = item
    const filename = `${dest}/${convertToJPG(name)}`
    return chrome.downloads.download({ url, filename }).then(downloadId => {
      return { av, ...item, downloadId }
    })
  })
  const res = await Promise.allSettled(tasks)
  console.log(res)
}


async function fsManage(method, ...args) {
  let url = 'http://localhost:3005/avmoo/fs'
  const { data } = await axios.post(url, {
    method: 'pathExists',
    params: args
  })

  console.log(data)
  return data
}
