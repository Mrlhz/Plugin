/**
 * ============================================================================
 * 配置项与常量定义 (Constants & Configuration)
 * ============================================================================
 */
export const COMMANDS = {
  BG_TO_OFFSCREEN: 'BACKGROUND_TO_OFFSCREEN',
  BG_TO_OFFSCREEN_SINGLE: 'BACKGROUND_TO_OFFSCREEN__SINGLE',
  OFFSCREEN_TO_BG: 'OFFSCREEN_TO_BACKGROUND',
  OFFSCREEN_TO_BG_SINGLE: 'OFFSCREEN_TO_BACKGROUND__SINGLE'
};

export const TOPIC_KEY = 'topic';
export const FAVICON_TAG = ``;
// 压缩后的全部样式
export const STYLES_ALL = ``;
export const STYLES_SIMPLE = `<style>.t_msgfontfix{width: 960px;}</style>`;
export const STYLES_ELEMENT = `<style>.sf-img {
    background-blend-mode: normal!important;
    background-clip: content-box!important;
    background-position: 50% 50%!important;
    background-color: rgba(0,0,0,0)!important;
    background-size: 100% 100%!important;
    background-origin: content-box!important;
    background-repeat: no-repeat!important;
}</style>`;

// 忽略的默认图片列表
export const DEFAULT_IMAGES = [
  'bg.gif'
];