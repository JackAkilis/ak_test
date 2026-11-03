import type { Customer } from '@/contracts/customer'
import { DAY, createRng } from './rng'

const SURNAMES = [
  '王',
  '李',
  '张',
  '刘',
  '陈',
  '杨',
  '黄',
  '赵',
  '周',
  '吴',
  '徐',
  '孙',
  '马',
  '朱',
  '胡',
  '郭',
  '林',
  '何',
  '高',
  '罗',
]
const GIVEN = [
  '伟',
  '芳',
  '娜',
  '敏',
  '静',
  '磊',
  '洋',
  '勇',
  '艳',
  '杰',
  '涛',
  '明',
  '超',
  '秀英',
  '霞',
  '平',
  '刚',
  '桂英',
  '思远',
  '雨桐',
]
const COMPANIES = [
  '星云科技',
  '极光网络',
  '远方数据',
  '蓝海智能',
  '晨曦教育',
  '鲸鱼电商',
  '松果健康',
  '云栖咖啡',
  '绿洲物流',
  '飞鸟传媒',
  '灯塔金融',
  '橙子设计',
  '北极光游戏',
  '麦田农业',
  '潮汐出行',
]
const SUFFIX = ['有限公司', '科技有限公司', '集团', '工作室', '网络科技']
const OWNERS = ['周雨欣', '陈嘉豪', '林思思', '黄志强']

export function seedCustomers(count = 48, seed = 42): Customer[] {
  const rng = createRng(seed)
  const base = Date.now() - 360 * DAY
  const list: Customer[] = []
  for (let i = 0; i < count; i++) {
    const plan = rng.pick(['free', 'free', 'pro', 'pro', 'pro', 'enterprise'] as const)
    const status = rng.pick(['trial', 'active', 'active', 'active', 'churned'] as const)
    const mrr = plan === 'free' ? 0 : plan === 'pro' ? rng.int(1, 20) * 199 : rng.int(5, 60) * 999
    const createdAt = new Date(base + rng.int(0, 350) * DAY + rng.int(0, DAY)).toISOString()
    const name = rng.pick(SURNAMES) + rng.pick(GIVEN)
    list.push({
      id: `cus_${String(i + 1).padStart(4, '0')}`,
      name,
      email: `user${i + 1}@${['example.com', 'mail.cn', 'corp.io'][i % 3]}`,
      company: rng.pick(COMPANIES) + rng.pick(SUFFIX),
      plan,
      status,
      mrr: status === 'churned' ? 0 : mrr,
      owner: rng.pick(OWNERS),
      notes: rng.next() > 0.7 ? '通过官网注册，重点跟进。' : '',
      createdAt,
      updatedAt: createdAt,
    })
  }
  return list
}
