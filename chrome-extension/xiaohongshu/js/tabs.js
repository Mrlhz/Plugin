

async function query() {
  const storage = await chrome.storage.local.get(null)
  if (!storage) {
    return
  }

  const result = []
  const userProfileKeys = Object.keys(storage).filter(key => key.includes('/user/profile'))
  userProfileKeys.forEach(userProfileKey => {
    // 取第一个有用户信息就行
    const [userProfile] = storage[userProfileKey]
    const { noteCard } = userProfile
    const { user } = noteCard
    result.push(`<div class="tab" id="${user.userId}"><span>${user.nickName}</span></div>`)
  })

  const tabsDom = document.getElementById('tabs')
  const html = result.join('')
  tabsDom.innerHTML = html

  console.log(storage, userProfileKeys)
}

query()
