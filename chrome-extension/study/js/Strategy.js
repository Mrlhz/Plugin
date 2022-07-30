/**
 * @description 策略模式：定义一系列的算法，把它们一个个封装起来，并且使它们可以相互替换。
 */
export class Strategy {
  constructor() {
    this.strategyMap = {}
  }
  on(type, fn) {
    let name = type
    let method = fn
    if (typeof type === 'function' && type.name) {
      name = type.name
      method = type
    }
    this.strategyMap[name] = method
  }
  // invok
  async emit(type, ...rest) {
    const fn = this.strategyMap[type]
    console.log(type, rest, this.strategyMap, fn)
    if (typeof fn !== 'function') return
    const result = await fn(...rest)
    return result
  }
}

export default new Strategy()
