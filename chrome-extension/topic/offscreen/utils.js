// 占位图生成器
export const createPlaceholderSvg = (w = 16, h = 16) => `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect fill-opacity="0"/></svg>`;

/**
 * @description Node.js path.parse(pathString) ponyfill.
 * @link https://github.com/jbgutierrez/path-parse
 * @export
 * @param {*} pathString
 * @returns
 * {
 *   root : '/',
 *   dir : '/home/user/dir',
 *   base : 'file.txt',
 *   ext : '.txt',
 *   name : 'file'
 *  }
 */
export function pathParse(pathString) {
  if (typeof pathString !== 'string') {
    throw new TypeError("Parameter 'pathString' must be a string, not " + typeof pathString)
  }
  var allParts = win32SplitPath(pathString)
  if (!allParts || allParts.length !== 5) {
    throw new TypeError("Invalid path '" + pathString + "'")
  }
  return {
    root: allParts[1],
    dir: allParts[0] === allParts[1] ? allParts[0] : allParts[0].slice(0, -1),
    base: allParts[2],
    ext: allParts[4],
    name: allParts[3]
  }
  function win32SplitPath(filename) {
    const splitWindowsRe = /^(((?:[a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?[\\\/]?)(?:[^\\\/]*[\\\/])*)((\.{1,2}|[^\\\/]+?|)(\.[^.\/\\]*|))[\\\/]*$/;
    return splitWindowsRe.exec(filename).slice(1)
  }
}

export function getSize(imageElement, computedStyle) {
	let pxWidth = imageElement.naturalWidth;
	let pxHeight = imageElement.naturalHeight;
	if (!pxWidth && !pxHeight) {
		const noStyleAttribute = imageElement.getAttribute("style") == null;
		if (!computedStyle) {
			try {
				computedStyle =  globalThis.getComputedStyle(imageElement);
				// eslint-disable-next-line no-unused-vars
			} catch (error) {
				// ignored
			}
		}
		if (computedStyle) {
			let removeBorderWidth = false;
			if (computedStyle.getPropertyValue("box-sizing") == "content-box") {
				const boxSizingValue = imageElement.style.getPropertyValue("box-sizing");
				const boxSizingPriority = imageElement.style.getPropertyPriority("box-sizing");
				const clientWidth = imageElement.clientWidth;
				imageElement.style.setProperty("box-sizing", "border-box", "important");
				removeBorderWidth = imageElement.clientWidth != clientWidth;
				if (boxSizingValue) {
					imageElement.style.setProperty("box-sizing", boxSizingValue, boxSizingPriority);
				} else {
					imageElement.style.removeProperty("box-sizing");
				}
			}
			let paddingLeft, paddingRight, paddingTop, paddingBottom, borderLeft, borderRight, borderTop, borderBottom;
			paddingLeft = getWidth("padding-left", computedStyle);
			paddingRight = getWidth("padding-right", computedStyle);
			paddingTop = getWidth("padding-top", computedStyle);
			paddingBottom = getWidth("padding-bottom", computedStyle);
			if (removeBorderWidth) {
				borderLeft = getWidth("border-left-width", computedStyle);
				borderRight = getWidth("border-right-width", computedStyle);
				borderTop = getWidth("border-top-width", computedStyle);
				borderBottom = getWidth("border-bottom-width", computedStyle);
			} else {
				borderLeft = borderRight = borderTop = borderBottom = 0;
			}
			pxWidth = Math.max(0, imageElement.clientWidth - paddingLeft - paddingRight - borderLeft - borderRight);
			pxHeight = Math.max(0, imageElement.clientHeight - paddingTop - paddingBottom - borderTop - borderBottom);
			if (noStyleAttribute) {
				imageElement.removeAttribute("style");
			}
		}
	}
	return { pxWidth, pxHeight };
}

export function getWidth(styleName, computedStyle) {
	if (computedStyle.getPropertyValue(styleName).endsWith("px")) {
		return parseFloat(computedStyle.getPropertyValue(styleName));
	}
}
