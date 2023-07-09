


```js
document.documentElement.innerHTML.match(/"traceId":".*?"/g).map(id => `https://sns-img-qc.xhscdn.com/${id.split(':')[1].replaceAll('"', '')}`).map(src => ({
  src: src
}))
```
