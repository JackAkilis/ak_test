export const env = {
  useMock: import.meta.env.VITE_USE_MOCK !== 'false',
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '',
  mockLatency: Number(import.meta.env.VITE_MOCK_LATENCY ?? 250),
  isTest: import.meta.env.MODE === 'test',
}
