(function ($) {
  var PageSwitch = (function(){
    function PageSwitch (element, options) {
      this.settings = $.extend(true, $.fn.PageSwitch.defaults, options || {});
      this.element = element;
      this.init();
    }

    PageSwitch.prototype = {
      init : function () {
        console.log('init');
      }
    }
    return PageSwitch;
  })()

  $.fn.PageSwitch = function (options) {
    // this 一般是一个jQuery类型的集合
    console.log(this);
    return this.each(function(){
      var __self = $(this);

      // var instance = new PageSwitch(__self, options);

      // ---
      var instance = __self.data('PageSwitch');
      // 单例模式
      if (!instance) {
        instance = new PageSwitch(__self, options);
        __self.data('PageSwitch', instance);
      }
      if($.type(options) === 'string') return instance[options]();
      // $('div').PageSwitch('init');
      // ---

    })
  }
  $.fn.PageSwitch.defaults = {
    // Custom selectors 自定义选择器
    // 分页处理
    // events 键盘事件
    // 滑动方向
    callback : ''
  }
})(jQuery)

$('.container').PageSwitch('init');