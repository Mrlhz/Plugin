
function myScript() {
  console.log('load my script', this, window)
}


document.addEventListener('click', (e) => {
  console.log(e, e.target)
}, false)
