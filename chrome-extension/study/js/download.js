import { convertToJPG } from './helper.js'
import { Downloads } from '../config.js'

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
  const exists = await fsManage('pathExists', Downloads.location)
  console.log(data)
  if (exists) {
    await download(data.images)
  }
  if (!exists) {
    console.log({ msg: `${Downloads.location} not exist` } )
  }
}

const progressEl = document.querySelector('#progress-wrap progress')
const progressContentEl = document.querySelector('#progress-content')
const progressPercentEl = document.querySelector('#progress-percent')

async function download(data = []) {
  progressEl.style.display = data.length ? 'block' : 'none'

  const result = []
  for (let index = 0, l = data.length; index < l; index++) {
    const item = data[index]
    const { av, name, url, dest } = item 
    const filename = `${dest}/${convertToJPG(name)}`
    const downloadItem = await chrome.downloads.download({ url, filename }).then(downloadId => {
      return { av, ...item, downloadId }
    })
    result.push(downloadItem)

    progressManage({
      value: index + 1,
      max: l,
      text: `${index + 1} / ${l}`,
      percent: `${percent(index + 1, l)}`
    })
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
    method,
    params: args
  })

  console.log(data)
  return data
}

async function progressManage({ value, max, text, percent }) {
  if (!progressEl) return

  progressEl.setAttribute('value', value)
  progressEl.setAttribute('max', max)
  progressEl.innerText = percent
  progressContentEl.innerText = text
  progressPercentEl.innerText = percent
}

function percent(n1, n2) {
  return Math.round(n1 / n2 * 10000) / 100 + '%'
}
