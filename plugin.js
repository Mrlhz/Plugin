(function ($) {
  var Plugin = (function () {
    function Plugin(element, options) {
      this.settings = $.extend(true, $.fn.Plugin.defaults, options || {});
      this.element = element;
      this.init();
    }

    Plugin.prototype = {
      init: function () {

      }
    }
    return Plugin;
  })()

  $.fn.Plugin = function (options) {
    // this 一般是一个jQuery类型的集合
    return this.each(function () {
      var __self = $(this);
      var instance = __self.data('Plugin');
      // 单例模式
      if (!instance) {
        instance = new Plugin(__self, options);
        __self.data('Plugin', instance);
      }
      if ($.type(options) === 'string') return instance[options]();
      // $('div').Plugin('init');
    })
  }
  $.fn.Plugin.defaults = {
    // 默认配置
    callback: ''
  }
})(jQuery)

// $('.container').Plugin('init');