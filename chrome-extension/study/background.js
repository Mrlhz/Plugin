
import menuInit from './js/contextMenus.js'
import commandInit from './js/commands.js'

import { cacheName } from './config.js'

import blogMenuInit from './js/menus/busjav.blog.js'

import './js/event.js'


menuInit()
commandInit()
blogMenuInit()
console.log(cacheName)
