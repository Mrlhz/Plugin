### 注意事项

移除插件前，先备份数据



```js
document.documentElement.innerHTML.match(/"traceId":".*?"/g).map(id => `https://sns-img-qc.xhscdn.com/${id.split(':')[1].replaceAll('"', '')}`).map(src => ({
  src: src
}))
```


```js

// 列表
JSON.parse(JSON.stringify(window.__INITIAL_STATE__.user.notes.value))


```



```js
var o = await chrome.storage.local.get(null)

Object.keys(o).filter(key => {
    var { user } = o[key] || {}
    return user && user.userId === '5ba773c69c1a530001d6f88a'
})


```


### 根据列表查详情
```js

void async function (userId) {
  var o = await chrome.storage.local.get(`https://www.xiaohongshu.com/user/profile/${userId}`)
  var list = Object.values(o).flat(1) || o[`https://www.xiaohongshu.com/user/profile/${userId}`]
  var taskList = list.map(({ id }) => chrome.storage.local.get(`https://www.xiaohongshu.com/explore/${id}`))
  var result = await Promise.all(taskList).then(res => {
    return res.map(item => Object.values(item)[0])
  })
  console.log({ o, result })
}('5e25e9090000000001006dd6')

var o = await chrome.storage.local.get('https://www.xiaohongshu.com/user/profile/5ead38be000000000100316c')
var list = Object.values(o).flat(1) || o['https://www.xiaohongshu.com/user/profile/5ead38be000000000100316c']
var taskList = list.map(({ id }) => chrome.storage.local.get(`https://www.xiaohongshu.com/explore/${id}`))
var result = await Promise.all(taskList).then(res => res.flat(1).map(item => Object.values(item)[0]))
console.log(result)
// 5ead38be000000000100316c
```




### 处理获取详情失败的
```js
void async function(userId) {
  var o = await chrome.storage.local.get(`https://www.xiaohongshu.com/user/profile/${userId}`)
  var list = Object.values(o).flat(1) || o[`https://www.xiaohongshu.com/user/profile/${userId}`]
  const result = []
  for (let index = 0; index < list.length; index++) {
    const { id } = list[index];
    const url = `https://www.xiaohongshu.com/explore/${id}`
    const res = await chrome.storage.local.get(url)
    if (!Object.values(res)[0]) {
      result.push(url)
      chrome.tabs.create({ url: url })
    }
  }
  console.log(result)
}('5e8c830d0000000001003641')
```


```js

// var list = [] // 从json文件粘贴数据
for (let index = 0; index < list.length; index++) {
  const note = list[index];
  const { noteId } = note
  const url = `https://www.xiaohongshu.com/explore/${noteId}`
  const res = await chrome.storage.local.get(url)
  if (!Object.values(res)[0]) {
    await chrome.storage.local.set({ [url]: note })
  }
}

```