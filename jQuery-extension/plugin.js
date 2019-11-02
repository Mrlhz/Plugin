(function ($) {
  var PluginName = (function () {
    function PluginName(element, options) {
      this.settings = $.extend(true, $.fn.PluginName.defaults, options || {});
      this.element = element;
      this.init();
    }

    PluginName.prototype = {
      init: function () {

      }
    }
    return PluginName;
  })()

  $.fn.PluginName = function (options) {
    // this 一般是一个jQuery类型的集合
    return this.each(function () {
      var __self = $(this);
      var instance = __self.data('PluginName');
      // 单例模式
      if (!instance) {
        instance = new PluginName(__self, options);
        __self.data('PluginName', instance);
      }
      if ($.type(options) === 'string') return instance[options]();
      // $('div').PluginName('init');
    })
  }
  $.fn.PluginName.defaults = {
    // 默认配置
    callback: ''
  }
})(jQuery)

// $('.container').PluginName('init');