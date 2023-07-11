


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