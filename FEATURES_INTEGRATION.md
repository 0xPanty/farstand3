# 🎨 新功能集成指南

## 已创建的功能

✅ **1. 保存到数据库**  
✅ **2. 下载高清图片**  
✅ **3. 社区画廊**

---

## 📋 部署前准备

### 1. 安装新依赖

```bash
npm install
```

新增的包：
- `@vercel/postgres` - Vercel Postgres 数据库
- `html2canvas` - 卡片截图/下载功能

### 2. 配置 Vercel Postgres

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目
3. 进入 **Storage** 标签
4. 点击 **Create Database** → 选择 **Postgres**
5. 创建数据库（免费配额：256 MB，60小时计算时间/月）
6. 数据库会自动关联到项目，环境变量自动注入

**无需手动配置环境变量！** Vercel 会自动设置：
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- 等等...

---

## 🔧 集成到 App.tsx

### 步骤 1: 添加 Imports

在 `App.tsx` 顶部添加：

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import Gallery from './Gallery';
import { downloadStandImage, shareOnFarcaster } from './services/downloadService';
```

### 步骤 2: 添加 State

在 `App` 组件内添加：

```typescript
const [showGallery, setShowGallery] = useState(false);
const [isSaving, setIsSaving] = useState(false);
const [saveSuccess, setSaveSuccess] = useState(false);
```

### 步骤 3: 添加保存函数

```typescript
const handleSaveToDatabase = useCallback(async () => {
  if (!standData || !farcasterUser) {
    alert('No Stand data to save');
    return;
  }

  setIsSaving(true);
  setSaveSuccess(false);

  try {
    const response = await fetch('/api/save-stand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        standData,
        farcasterUser
      }),
    });

    const data = await response.json();

    if (data.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      throw new Error(data.error);
    }
  } catch (error: any) {
    console.error('Save error:', error);
    alert(`Failed to save: ${error.message}`);
  } finally {
    setIsSaving(false);
  }
}, [standData, farcasterUser]);
```

### 步骤 4: 添加下载函数

```typescript
const handleDownload = useCallback(async () => {
  if (!standData?.standImageUrl) {
    alert('No image to download');
    return;
  }

  const success = await downloadStandImage(
    standData.standImageUrl,
    standData.standName
  );

  if (success) {
    alert('✅ Image downloaded!');
  } else {
    alert('❌ Download failed');
  }
}, [standData]);
```

### 步骤 5: 添加分享函数

```typescript
const handleShare = useCallback(() => {
  if (!standData) return;
  
  shareOnFarcaster(
    standData.standName,
    'https://farstand3.vercel.app' // 你的应用 URL
  );
}, [standData]);
```

### 步骤 6: 在 UI 中添加按钮

找到 Stand 卡片显示的地方，在卡片下方添加操作按钮：

```typescript
{/* 操作按钮区 - 在卡片显示后 */}
{standData && (
  <div className="w-full px-4 py-6 flex flex-col gap-3 z-20">
    {/* 保存按钮 */}
    <button
      onClick={handleSaveToDatabase}
      disabled={isSaving || saveSuccess}
      className={`
        w-full h-14 border-4 border-white font-black text-lg tracking-widest
        transition-all duration-200 active:scale-95
        ${saveSuccess 
          ? 'bg-green-600 text-white' 
          : 'bg-gradient-to-r from-[#db2777] to-[#c026d3] text-white hover:shadow-[0_0_20px_rgba(219,39,119,0.6)]'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {isSaving ? '💾 SAVING...' : saveSuccess ? '✅ SAVED!' : '💾 SAVE TO GALLERY'}
    </button>

    {/* 下载和分享按钮 - 横排 */}
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={handleDownload}
        className="h-14 bg-[#06b6d4] border-4 border-white font-black text-lg tracking-widest hover:bg-[#0891b2] transition-colors active:scale-95"
      >
        ⬇️ DOWNLOAD
      </button>

      <button
        onClick={handleShare}
        className="h-14 bg-[#7c3aed] border-4 border-white font-black text-lg tracking-widest hover:bg-[#6d28d9] transition-colors active:scale-95"
      >
        🔗 SHARE
      </button>
    </div>

    {saveSuccess && (
      <p className="text-center text-green-400 text-sm animate-pulse">
        ✨ Stand saved to community gallery!
      </p>
    )}
  </div>
)}
```

### 步骤 7: 添加画廊入口按钮

在主页面顶部（Farcaster 用户信息区）添加画廊按钮：

```typescript
{/* 顶部导航 - 添加画廊按钮 */}
<div className="absolute top-4 right-4 z-30">
  <button
    onClick={() => setShowGallery(true)}
    className="flex items-center gap-2 px-4 py-2 bg-black/60 border-2 border-[#fbbf24] rounded-full backdrop-blur-sm hover:bg-[#fbbf24] hover:text-black transition-all font-bold"
  >
    <Users size={20} />
    <span>GALLERY</span>
  </button>
</div>
```

### 步骤 8: 添加画廊视图切换

在 `App` 组件的 return 语句最开始添加：

```typescript
// 如果显示画廊，切换到画廊视图
if (showGallery) {
  return <Gallery onBack={() => setShowGallery(false)} />;
}

// 否则显示正常流程...
if (showInteraction) {
  return <PrinterView ... />;
}
```

---

## 🧪 测试功能

### 本地测试（注意：数据库功能需要部署后才能用）

```bash
npm run dev
```

1. ✅ **生成 Stand**
2. ✅ **点击 "SAVE TO GALLERY"** - 会报错（正常，本地没数据库）
3. ✅ **点击 "DOWNLOAD"** - 应该能下载图片
4. ✅ **点击 "SHARE"** - 应该打开 Warpcast compose

### 部署到 Vercel

```bash
git add .
git commit -m "feat: add database save, download, and community gallery"
git push
```

Vercel 会自动部署并连接数据库。

### 生产测试

1. 打开 Warpcast 中的 Mini App
2. 生成 Stand
3. 点击 "SAVE TO GALLERY" → 应该成功
4. 点击右上角 "GALLERY" 按钮 → 查看所有 Stand
5. 点击画廊中的 Stand → 查看详情

---

## 📊 数据库结构

自动创建的表：

```sql
CREATE TABLE stands (
  id SERIAL PRIMARY KEY,
  fid INTEGER NOT NULL,
  username VARCHAR(255),
  display_name VARCHAR(255),
  pfp_url TEXT,
  stand_name VARCHAR(255) NOT NULL,
  gender VARCHAR(10),
  user_analysis TEXT,
  stand_description TEXT,
  ability TEXT,
  battle_cry TEXT,
  stats JSONB,
  stat_details JSONB,
  stand_image_url TEXT,
  sketch_image_url TEXT,
  visual_prompt TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**特性：**
- 每个用户（FID）只能有 1 个 Stand（重新生成会覆盖）
- 自动建索引（fid, created_at）加速查询
- JSONB 存储 stats 数据，支持高级查询

---

## 🎯 功能说明

### 1. 保存到数据库 💾
- 点击 "SAVE TO GALLERY" 保存当前 Stand
- 自动覆盖之前的 Stand（每个用户只能有1个）
- 保存后会显示在社区画廊

### 2. 下载高清图片 ⬇️
- 点击 "DOWNLOAD" 下载 Stand 图片
- 文件名格式：`StandName_Stand.png`
- 支持 PNG 格式

### 3. 社区画廊 🖼️
- 点击右上角 "GALLERY" 进入
- 瀑布流展示所有用户的 Stand
- 点击任意 Stand 查看详情
- 支持无限滚动加载

### 4. 分享到 Farcaster 🔗
- 点击 "SHARE" 打开 Warpcast compose
- 自动填充文本和应用链接
- 方便传播

---

## 💰 费用（Vercel 免费额度）

- **Postgres 数据库**: 256 MB 存储，60小时/月（免费）
- **API 调用**: 100 GB 带宽/月（免费）
- **预计容量**: ~1000-5000 个 Stand（取决于图片大小）

---

## 🐛 故障排除

### 保存失败："Database error"
- 确保在 Vercel 中创建了 Postgres 数据库
- 检查环境变量是否自动注入
- 查看 Vercel 部署日志

### 画廊为空
- 确保至少有一个 Stand 保存成功
- 检查 `/api/get-gallery` 是否正常返回

### 下载失败
- 确保图片 URL 可访问
- 检查浏览器控制台错误

### 分享按钮无反应
- 确保允许弹出窗口
- 检查浏览器是否阻止了 `window.open()`

---

## 🚀 部署清单

- [ ] 已安装新依赖 (`npm install`)
- [ ] 已在 Vercel 创建 Postgres 数据库
- [ ] 已集成所有代码到 `App.tsx`
- [ ] 已提交并推送代码
- [ ] 已在 Warpcast 中测试完整流程
- [ ] 确认保存、下载、画廊功能正常

---

🎉 **完成后，你的应用将拥有完整的社区功能！**
