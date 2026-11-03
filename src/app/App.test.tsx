import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/utils'

describe('App 路由与布局', () => {
  it('根路径跳转总览并渲染指标卡与侧边导航', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { name: '总览' })).toBeInTheDocument()
    expect(await screen.findByText('客户总数')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument()
    expect(screen.getByText('Mock 数据模式')).toBeInTheDocument()
  })

  it('通过侧边栏切换到客户页', async () => {
    renderApp('/')
    await screen.findByRole('heading', { name: '总览' })
    await userEvent.click(screen.getByRole('link', { name: '客户' }))
    expect(await screen.findByRole('heading', { name: '客户管理' })).toBeInTheDocument()
  })

  it('未知路径显示 404', async () => {
    renderApp('/nope')
    expect(await screen.findByText('404')).toBeInTheDocument()
  })
})
