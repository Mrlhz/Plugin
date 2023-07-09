function myScript() {
  console.log('load my script', this, window)
}


document.addEventListener('click', (e) => {
  console.log((window?.__INITIAL_STATE__?.note?.note?.value || window?.__INITIAL_STATE__?.note?.note || {}));
}, false)

console.log('send', window?.__INITIAL_STATE__?.note?.note?.value)
const val = { ...window?.__INITIAL_STATE__?.note?.note?.value }

if (Object.keys(val).length) {
  const result = JSON.parse(JSON.stringify(val))

  console.log(result)
  window.postMessage({
    note: { ...result }
   }, '*')
}

