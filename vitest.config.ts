import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
      restoreMocks: true,
      // Node 22+ 自带实验性 localStorage，访问时会打警告；测试里用 jsdom 的实现，关闭 Node 的
      poolOptions: { forks: { execArgv: ['--no-experimental-webstorage'] } },
      env: {
        // jsdom 下 fetch 需要绝对地址；与 jsdom 默认 origin 一致，MSW 的相对路径 handler 可匹配
        VITE_API_BASE_URL: 'http://localhost:3000',
        VITE_USE_MOCK: 'true',
      },
    },
  }),
)
