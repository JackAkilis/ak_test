import '@testing-library/jest-dom/vitest'
import { transferableAbortController } from 'node:util'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

// jsdom 27 自带的 AbortController / AbortSignal 不被 Node 原生 fetch(undici) 接受：
// "Expected signal to be an instance of AbortSignal"。react-query / react-router 都会传 signal，
// 这里把全局替换回 Node 原生实现（transferableAbortController 是拿到原生类的公开途径）。
const nativeController = transferableAbortController()
globalThis.AbortController = nativeController.constructor as typeof AbortController
globalThis.AbortSignal = nativeController.signal.constructor as typeof AbortSignal
import { resetDb } from '@/mocks/db'
import { server } from '@/mocks/server'

// 所有单元 / 集成测试都通过 MSW 的 Node 端 Mock 访问接口，与浏览器行为一致
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetDb()
  cleanup()
})
afterAll(() => server.close())
