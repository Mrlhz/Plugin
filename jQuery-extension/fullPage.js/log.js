// 通过$.extend()来扩展jQuery
// 在jQuery全局对象上扩展方法
// 静态方法 || 公用方法
// 定义插件一般用$.fn.extend方法

$.extend({
  log: function (msg = '') {
    console.log(time + msg);
    return new Date().toLocaleString() + msg;
  }
});