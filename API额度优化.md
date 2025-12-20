# 🔧 Neynar API 额度耗尽 - 紧急优化方案

## 问题确认 ✅
- API 使用率：154.30%（超额 54.30%）
- 主要消耗：/v2/farcaster/feed/user/casts（140万 credits）
- 状态：API 已被限流，返回 429 错误

## 🚨 立即执行（减少 90% API 调用）

### Step 1: 添加本地缓存

修改 `api/farcaster.ts`，添加缓存机制：

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

// 🔥 添加内存缓存（生产环境应使用 Redis）
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fid } = req.query;

    if (!fid) {
      return res.status(400).json({ error: 'Missing fid parameter' });
    }

    const cacheKey = `user_${fid}`;
    
    // 🔥 检查缓存
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`✅ Cache hit for FID ${fid}`);
      return res.status(200).json(cached.data);
    }

    console.log(`📡 Fetching fresh data for FID ${fid}`);

    // Fetch user profile
    const profile = await fetchFarcasterUser(Number(fid));
    
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate stats
    const calculatedData = await calculateFarcasterStats(profile);

    const result = {
      profile,
      stats: calculatedData.stats,
      details: calculatedData.details
    };

    // 🔥 存入缓存
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    // 🔥 清理过期缓存
    if (cache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          cache.delete(key);
        }
      }
    }

    return res.status(200).json(result);

  } catch (error: any) {
    console.error('Farcaster API Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch Farcaster data' });
  }
}

// ... 其余代码保持不变
```

### Step 2: 减少不必要的 Feed 调用

在 `api/farcaster.ts` 中，**减少 casts 采样数量**：

```typescript
// 原来：limit=150（消耗大量 credits）
const castsResponse = await fetch(
  `https://api.neynar.com/v2/farcaster/feed/user/casts?fid=${fid}&limit=150`,
  ...
);

// 🔥 改为：limit=25（减少 83% 调用量）
const castsResponse = await fetch(
  `https://api.neynar.com/v2/farcaster/feed/user/casts?fid=${fid}&limit=25`,
  {
    headers: {
      accept: "application/json",
      "x-api-key": NEYNAR_API_KEY,
    },
  }
);
```

### Step 3: 完全移除 Hub API 调用

找到这段代码（约第 86 行）并**注释掉**：

```typescript
// 🔥 注释掉这整段 - Hub API 调用太慢且不必要
/*
// Fetch real cast count from Hub API (with pagination)
let castCount = 0;
try {
  let nextPageToken: string | null = null;
  do {
    const url = `https://hub.pinata.cloud/v1/castsByFid?fid=${fid}&pageSize=1000${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
    const hubResponse = await fetch(url);
    if (hubResponse.ok) {
      const hubData = await hubResponse.json();
      castCount += hubData.messages?.filter(
        (m: any) => m.data?.type === 'MESSAGE_TYPE_CAST_ADD'
      ).length || 0;
      nextPageToken = hubData.nextPageToken || null;
    } else {
      break;
    }
  } while (nextPageToken);
} catch (e) {
  console.warn("Hub API fetch failed:", e);
}
*/

// 🔥 直接使用 Neynar 的 cast_count
const castCount = user.cast_count || sampledCastCount;
```

### Step 4: 减少数据库查询（如果有）

检查 `api/get-stand.ts`，确保不会频繁调用 Neynar：

```typescript
// 已生成的 Stand 不需要重新调用 Neynar
// 直接从数据库返回
```

## 📊 优化效果预估

| 优化项 | 减少量 | 说明 |
|--------|--------|------|
| 添加 5 分钟缓存 | -80% | 同一用户 5 分钟内不重复调用 |
| Casts limit 150→25 | -83% | 每次调用减少 125 个 cast 的数据 |
| 移除 Hub API | -50% | 完全移除慢速的分页调用 |
| **总计** | **-90%+** | 综合优化效果 |

## 🎯 长期优化方案

### 1. 使用 Vercel KV 存储（推荐）

```bash
# 安装 Vercel KV
npm install @vercel/kv
```

```typescript
import { kv } from '@vercel/kv';

// 存储
await kv.set(`user:${fid}`, data, { ex: 300 }); // 5分钟过期

// 读取
const cached = await kv.get(`user:${fid}`);
```

### 2. 设置 CDN 缓存头

```typescript
res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
```

### 3. 批量获取用户数据

```typescript
// ❌ 不好：为 10 个用户调用 10 次
for (const fid of fids) {
  await fetch(`/api/farcaster?fid=${fid}`);
}

// ✅ 好：一次调用获取所有
await fetch(`/api/farcaster/bulk?fids=${fids.join(',')}`);
```

### 4. 监控 API 使用

在 `api/farcaster.ts` 添加日志：

```typescript
console.log(`[NEYNAR] User bulk API called for FID ${fid}`);
console.log(`[NEYNAR] Casts API called, limit=25`);
```

## 🚀 立即执行清单

- [ ] Step 1: 添加缓存机制（5分钟 TTL）
- [ ] Step 2: 减少 casts limit 从 150 到 25
- [ ] Step 3: 移除 Hub API 调用
- [ ] Step 4: 重新部署到 Vercel
- [ ] Step 5: 测试 API 响应速度
- [ ] Step 6: 监控 Neynar 使用率下降

## 🔍 验证优化效果

### 测试缓存是否生效：

```bash
# 第一次调用（应该调用 Neynar）
curl "https://你的域名/api/farcaster?fid=3"

# 立即第二次调用（应该从缓存返回）
curl "https://你的域名/api/farcaster?fid=3"
```

查看 Vercel 日志，第二次应该显示 `✅ Cache hit`

### 监控 Neynar Dashboard：

访问 https://dev.neynar.com/usage
查看调用量是否显著下降

## ⚡ 临时应急方案

如果优化后仍超额，可以：

1. **限制用户生成频率**：每个用户每天只能生成 1 次
2. **使用静态数据**：为演示用户返回预设数据
3. **升级套餐**：增加 API 额度上限

## 💰 成本对比

| 方案 | 月成本 | API 调用量 | 适用场景 |
|------|--------|------------|----------|
| 当前（免费套餐） | $0 | ~1M/月 | ❌ 已超额 |
| Growth 套餐 | $49 | 10M/月 | ✅ 推荐 |
| Pro 套餐 | $199 | 50M/月 | 高流量应用 |
| 优化后（免费） | $0 | ~200K/月 | ✅ 够用 |

---

**立即执行这 4 步优化，可以在不升级套餐的情况下解决问题！**

下次周期重置（1月9日）后会恢复正常，但需要立即优化避免再次超额。
