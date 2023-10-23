// import { getAllBgImages } from './utils.js'

export function getNoteDetail() {
  function getAllBgImages(selectors) {
    var e, t = [];
    var r = selectors
    ? document.getElementsByTagName("*")
    : document.querySelectorAll(selectors);
    for (r = t.slice.call(r, 0, r.length); r.length;)(e = deepCss(r.shift(), "background-image")) && (e = /url\(['"]?([^")]+)/.exec(e) || []), (e = e[1]) && !e.match(/:\/\//) && (e = e.match(/^\/\//) ? location.protocol + e : e.match(/^\/[^/]/) ? location.protocol + "//" + location.host + e : location.href.replace(/[^/]+$/, e)), e && -1 == t.indexOf(e) && (t[t.length] = e);
    return t
  }
  function deepCss(ele, property) {
    if (!ele || !ele.style) return '';
    // background-image => backgroundImage
    const camelCaseKey = property.replace(/\-([a-z])/g, function (e, t) {
      return t.toUpperCase()
    });
    if (ele.currentStyle) {
      return ele.style[camelCaseKey] || ele.currentStyle[camelCaseKey] || ''
    };
    const w = document.defaultView || window;
    return ele.style[camelCaseKey] || w.getComputedStyle(ele, '').getPropertyValue(property) || ''
  }

  function getHtml() {
    // 1.用户信息
    const userNameEl = document.querySelector('.user-basic .user-nickname .user-name')
    const name = userNameEl ? userNameEl.innerText?.trim() : ''
    const url = location.href
    // 2. 标题
    const title = document.querySelector('.user-desc')
    // 3. 描述
    const desc = [...document.querySelectorAll('.note-content .desc')].map(item => item.innerText?.trim())
    // 4. 图片
    const images = [...new Set(getAllBgImages('.swiper-wrapper .swiper-slide') || [])]
      .filter(url => {
        return !url.includes('www.xiaohongshu.com/explore/data:image')
      }).map((url, i) => {
        return { url, filename: `p${i + 1}` } // TODO 文件后缀名
      })

    const date = document.querySelector('.note-content .date')

    console.log(window.__INITIAL_STATE__)
  
    return {
      title: title ? title.innerText : '',
      images,
      desc,
      date: date ? date.innerText : '',
      name,
      url,
      info: { ...(window?.__INITIAL_STATE__?.note?.note?.value || window?.__INITIAL_STATE__?.note?.note || {})  }
    }
  }
  return getHtml()
}

function parse(src) {
  if (src.match(/^data/)) return src
  const rule = {
    srcPattern: 'ci.xiaohongshu.com',
    replaceRule: `'@'.replace(/\\?aki_policy=.*|\\?tdsourcetag=s_pcqq_aiomsg/, '?aki_policy=xx_large')`
  }
  const srcPattern = new RegExp(rule.srcPattern)
  const replaceRule = rule.replaceRule
  if (srcPattern && srcPattern.test(src)) {
    let ret = src
    try {
      ret = eval(replaceRule.replace(/@/g, src));
      return ret
    } catch (e) {}
  }
}
