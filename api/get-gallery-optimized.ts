import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

// 🔥 添加缓存
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2分钟缓存

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // 🔥 限制最大100
    const offset = parseInt(req.query.offset as string) || 0;

    // 🔥 检查缓存
    const cacheKey = `gallery_${limit}_${offset}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('✅ Cache hit:', cacheKey);
      return res.status(200).json(cached.data);
    }

    console.log('📡 Fetching from DB:', { limit, offset });

    // 🔥 优化：使用超时和并行查询
    const queryPromise = sql`
      SELECT 
        id,
        fid,
        username,
        display_name,
        stand_name,
        stats,
        stand_image_url,
        created_at
      FROM stands
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const countPromise = sql`
      SELECT COUNT(*) as total FROM stands
    `;

    // 设置 8 秒超时
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 8000)
    );

    const [result, countResult] = await Promise.race([
      Promise.all([queryPromise, countPromise]),
      timeoutPromise
    ]) as any;

    const total = parseInt(countResult.rows[0].total);

    const responseData = {
      success: true,
      stands: result.rows,
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    };

    // 🔥 存入缓存
    cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });

    // 🔥 清理过期缓存
    if (cache.size > 50) {
      const now = Date.now();
      for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          cache.delete(key);
        }
      }
    }

    console.log('✅ Query success:', { total, returned: result.rows.length });
    return res.status(200).json(responseData);

  } catch (error: any) {
    console.error('❌ Gallery error:', error);
    
    // 🔥 降级：返回空数据而不是错误
    return res.status(200).json({
      success: true,
      stands: [],
      total: 0,
      limit: 50,
      offset: 0,
      hasMore: false,
      error: error.message
    });
  }
}
