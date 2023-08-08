import { useIntersectionObserver } from "@vueuse/core"

const SKELETON_ANIMATION_CLASS = 'skeleton-loading'

const HTML_TAGNAME = {
    IMG: 'IMG',
    DIV: 'DIV',
    SPAN: 'SPAN'
}

// 如果沒有給定長寬導致元素無法顯示的話可以給定一個預設值
const DEFAULT_SKELETON_SIZE = {
    WIDTH: {
        [HTML_TAGNAME.SPAN]: '1rem',
        [HTML_TAGNAME.DIV]: '1rem',
        [HTML_TAGNAME.IMG]: '4rem'
    },
    HEIGHT: {
        [HTML_TAGNAME.SPAN]: '0.4rem',
        [HTML_TAGNAME.DIV]: '0.4rem',
        [HTML_TAGNAME.IMG]: '4rem'
    }
}

function isPlainObject(value) {
    return value && Object.prototype.toString.call(value) === "[object Object]"
}

function isFunction(value) {
    return value && typeof value === 'function'
}

function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key)
}

function isUndefined(value) {
    return typeof value === 'undefined'
}

function isElement(el, tag) {
    return el && el.tagName === tag
}

function numberToPixel(value) {
    if (/^\d+(\.\d+)?$/.test(value)) return `${parseInt(value)}px`
    return value
}

function setElementWidth(el, binding) {
    const elClientInfo = el.getBoundingClientRect()
    return binding?.value?.width || elClientInfo.width || DEFAULT_SKELETON_SIZE.WIDTH[el.tagName]
}

function setElementHeight(el, binding) {
    const elClientInfo = el.getBoundingClientRect()
    return binding?.value?.height || elClientInfo.height || DEFAULT_SKELETON_SIZE.HEIGHT[el.tagName]
}

function setObjectValue(binding) {
    return hasOwn(binding.value, "toggle") ? binding.value.toggle : true
}

function isShowSkeleton(binding) {
    if (isUndefined(binding.value)) return true
    const isObject = isPlainObject(binding.value)
    return isObject ? setObjectValue(binding) : binding.value
}

function isHideSkeleton(binding) {
    if (isUndefined(binding.value)) return false
    const isObject = isPlainObject(binding.value)
    return isObject ? !setObjectValue(binding) : !binding.value
}

function createSkeletonElement(el, binding) {
    const skeletonEl = document.createElement("div")
    skeletonEl.classList = el.classList
    skeletonEl.classList.add(SKELETON_ANIMATION_CLASS)
    skeletonEl.style.width = numberToPixel(setElementWidth(el, binding))
    skeletonEl.style.height = numberToPixel(setElementHeight(el, binding))
    return skeletonEl
}

function resetImgElement(el, skeletonEl, originSrc, originOnLoad, originOnError) {
    if (el.src !== originSrc) {
        el.setAttribute("src", el.src || originSrc)
    }
    el.onload = function () {
        isFunction(originOnLoad) && originOnLoad()
        skeletonEl.replaceWith(el)
    }
    el.onerror = function () {
        isFunction(originOnError) && originOnError()
        skeletonEl.replaceWith(el)
    }
}

/**
 * v-skeleton 指令可接收的相關參數
 *  - 參數可為一個 boolean 值或是一個 object
 *  - object 中可帶 toggle、width、height 三種屬性
 *  - 如果為 boolean 值，該值的意義與 object 的 toggle 值相同
 *  - 如果未給定參數將預設為 true，即永遠顯示骨架，object 中未帶 toggle 值亦同
 *  - img 元素請給 true 或是不帶值，圖片載入完成會自動關閉骨架
 *  - img 元素開啟骨架後會一直開啟直到圖片載入完成或失敗，不管 toggle 值是否改變
 *  - img 元素有實做 lazy load 的效果，不用再另外處理
 *  - img 以外的元素將依照帶入的值判斷是否顯示骨架
 *  - 如果有顯示尺寸大小的問題請指定骨架的長寬，如果不指定將會使用預設的值(可於 DEFAULT_SKELETON_SIZE 修改)
 * 
 * @param {(boolean|object)} [value] - 參數可為一個 boolean 值或是一個 object
 * @param {boolean} [value.toggle] - 是否要顯示骨架，true 為顯示，false 為不顯示
 * @param {(number|string)} [value.width] - 指定給骨架的寬度，如果只給數字會自動轉成 px
 * @param {(number|string)} [value.height] - 指定給骨架的高度，如果只給數字會自動轉成 px
 * 
 * @example
 * v-skeleton                                                       // 未給定值將預設為顯示骨架
 * v-skeleton="bool-variable"                                       // 單 boolean 值形式
 * v-skeleton="{toggle: bool-variable, width: 100, height: '1rem'}" // object 形式
 * <img v-skeleton :src="..." />                                    // 圖片顯示骨架，圖片載入完成或失敗會自動關閉
 * <img v-skeleton="{width: 200, height: 100}" :src="..." />        // 圖片顯示骨架並指定長寬
 * <span v-skeleton ></span>                                        // 其他元素如未帶值將會永遠顯示骨架
 */
export const SkeletonDirective = {
    mounted(el, binding) {
        if (!isShowSkeleton(binding)) return
        if (isElement(el, HTML_TAGNAME.IMG)) {
            const originSrc = el.src
            const originOnError = el.onerror
            const originOnLoad = el.onload
            el.removeAttribute('src')
            el.onload = () => {}
            el.onerror = () => {}
            const skeletonEl = createSkeletonElement(el, binding)
            el.replaceWith(skeletonEl)
            useIntersectionObserver(skeletonEl, ([{ isIntersecting }]) => {
                if (!isIntersecting) return
                resetImgElement(el, skeletonEl, originSrc, originOnLoad, originOnError)
            })
        } else {
            const elWidth = setElementWidth(el, binding)
            const elHeight = setElementHeight(el, binding)
            el.style.setProperty("--width", numberToPixel(elWidth))
            el.style.setProperty("--height", numberToPixel(elHeight))
            el.classList.add(SKELETON_ANIMATION_CLASS)
        }
    },
    updated(el, binding) {
        if (!isHideSkeleton(binding)) return
        el.style.removeProperty("--width")
        el.style.removeProperty("--height")
        el.classList.remove(SKELETON_ANIMATION_CLASS)
    },
}