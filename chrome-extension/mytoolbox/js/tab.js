const data = [{
    url: "https://github.com/",
    img: "https://github.com/favicon.ico",
    title: "GitHub",
    desc: "一个面向开源及私有软件项目的托管平台",
    type: "［前端］代码托管"
  },
  {
    url: "https://github.com/Mrlhz",
    img: "../image/favicon.ico",
    title: "Mrlhz",
    desc: "我的github",
    type: ""
  },
  {
    url: "https://mrlhz.github.io/blog",
    img: "../image/favicon.ico",
    title: "恋空一译",
    desc: "My Blog",
    type: ""
  },
  {
    url: "https://developer.mozilla.org/zh-CN/",
    img: "https://developer.mozilla.org/static/img/favicon32.7f3da72dcea1.png",
    title: "MDN Web 文档",
    desc: "提供开放网络技术有关的信息",
    type: ""
  },
  {
    url: "https://developer.mozilla.org/zh-CN/docs/Web/JavaScript",
    img: "https://developer.mozilla.org/static/img/favicon32.7f3da72dcea1.png",
    title: "JavaScript",
    desc: "Web 开发技术JavaScript",
    type: ""
  },
  {
    url: "https://leetcode-cn.com/",
    img: "https://assets.leetcode.com/static_assets/public/icons/favicon.ico",
    title: "LeetCode",
    desc: "全球极客挚爱的技术成长平台",
    type: ""
  },
  {
    url: "https://regexper.com/",
    img: "https://regexper.com/favicon.ico",
    title: "Regexper",
    desc: "正则表达式的可视化开源工具",
    type: ""
  },
  {
    url: "https://yiyibooks.cn/",
    img: "https://yiyibooks.cn/favicon.ico",
    title: "一译",
    desc: "在线技术文档协作翻译网",
    type: ""
  },
  {
    url: "http://nodejs.cn/",
    img: "https://nodejs.org/static/images/favicons/favicon.ico",
    title: "Node.js",
    desc: "Node.js 中文网",
    type: ""
  },
  {
    url: "https://www.html.cn/doc/jsdoc/index.html",
    img: "https://www.html.cn/favicon.ico",
    title: "JSDoc",
    desc: "JSDoc 在线学习参考手册文档",
    type: ""
  },
  {
    url: "https://translate.google.cn/",
    img: "https://translate.google.cn/favicon.ico",
    title: "Google翻译",
    desc: "Google 的免费翻译服务",
    type: ""
  },
  {
    url: "https://fanyi.baidu.com/",
    img: "https://fanyi.baidu.com/favicon.ico",
    title: "百度翻译",
    desc: "百度提供的翻译服务",
    type: ""
  },
  {
    url: "https://www.npmjs.com/",
    img: "../image/npmjs.png",
    title: "Npmjs",
    desc: "JS管理包及强大的构建工具",
    type: ""
  },
  {
    url: "http://codepen.io/",
    img: "../image/codepen.png",
    title: "codepen",
    desc: "前端炫酷样式技能效果",
    type: ""
  },
  {
    url: "https://www.runoob.com/",
    img: "https://www.runoob.com/favicon.ico",
    title: "菜鸟教程",
    desc: "学的不仅是技术,更是梦想",
    type: ""
  },
  {
    url: "https://docschina.org/",
    img: "https://docschina.org/favicon.ico",
    title: "印记中文",
    desc: "Web 前端开发人员提供优质文档",
    type: ""
  },
  {
    url: "https://w3techs.com/",
    img: "../image/w3techs.ico",
    title: "w3techs",
    desc: "web网站技术调查报告",
    type: ""
  },
  {
    url: "https://www.bilibili.com/",
    img: "https://www.bilibili.com/favicon.ico",
    title: "bilibili",
    desc: "国内领先的年轻人文化社区",
    type: ""
  },
  {
    url: "https://stackoverflow.com/",
    img: "https://stackoverflow.com/favicon.ico",
    title: "Stackoverflow",
    desc: "全球专业的程序员IT技术问答社区",
    type: ""
  },
  {
    url: "",
    img: "",
    title: "",
    desc: "",
    type: ""
  },
  {
    url: "",
    img: "",
    title: "",
    desc: "",
    type: ""
  }
]

chrome.bookmarks.getTree(function(bookmarkArray){
  // console.log(bookmarkArray);
  // console.log(main(bookmarkArray))
});

function main(arr) {
  const res = []
  function dfs(arr) {
    const temp = []
    for (const node of arr) {
      node.children ? dfs(node.children) : temp.push(node)
    }
    // console.log(temp)
    res.push(...temp)
  }

  dfs(arr)
  
  const d = res.map((item) => {
    return {
      title: item.title,
      url: item.url,
      img: '../image/favicon.ico',
      desc: '',
      type: ''
    }
  })
  return d
}

const str = data.map((item) => {
  return `
  <a href="${item.url}" class="item">
    <div class="logo">
      <div class="el-image">
        <img src="${item.img}" alt="${item.title}">
      </div>
      <span>${item.title}</span>
    </div>
    <div class="desc">${item.desc}</div>
  </a>
  `
}).join('');

document.querySelector('.app').innerHTML = str

// https://github.com/geekape/geek-navigation