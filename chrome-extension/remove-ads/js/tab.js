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
    url: "https://leetcode-cn.com/",
    img: "https://assets.leetcode.com/static_assets/public/icons/favicon.ico",
    title: "LeetCode",
    desc: "全球极客挚爱的技术成长平台",
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
    url: "https://docschina.org/",
    img: "https://docschina.org/favicon.ico",
    title: "印记中文",
    desc: "Web 前端开发人员提供优质文档",
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
    url: "https://fanyi.baidu.com/",
    img: "https://fanyi.baidu.com/favicon.ico",
    title: "百度翻译",
    desc: "百度提供的翻译服务",
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
    url: "https://yiyibooks.cn/",
    img: "https://yiyibooks.cn/favicon.ico",
    title: "一译",
    desc: "在线技术文档协作翻译网",
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
    url: "",
    img: "https://developer.mozilla.org/favicon.ico",
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