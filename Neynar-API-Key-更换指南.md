# 🔑 Neynar API Key 更换指南

## 📋 前置准备

- [ ] 新邮箱账号
- [ ] 信用卡/借记卡（支持国际支付）
- [ ] 访问 Vercel 控制台的权限

---

## 🛒 Step 1: 购买 Neynar Growth 套餐

### 1.1 注册新账号

```
1. 访问 https://dev.neynar.com/
2. 点击右上角 "Sign Up"
3. 输入新邮箱和密码
4. 验证邮箱（检查收件箱）
5. 完成注册
```

### 1.2 购买 Growth 套餐

```
1. 登录新账号
2. 点击左侧菜单 "Billing" 或访问 https://dev.neynar.com/billing
3. 找到 "Growth" 套餐：
   
   Growth Plan
   - $9/month
   - 5M credits/month
   - Email support
   
4. 点击 "Subscribe" 或 "Get Started"
5. 输入支付信息：
   - 信用卡号
   - 有效期
   - CVV
   - 账单地址
6. 确认并支付
7. 等待支付成功确认
```

### 1.3 获取新的 API Key

```
1. 支付成功后，访问 https://dev.neynar.com/settings
2. 或点击左侧菜单 "API Keys"
3. 你会看到类似这样的 Key：
   
   NEYNAR_API_DOCS_xxxxxxxxxxxxxxxxxxxx
   
4. 点击 "Copy" 按钮复制
5. ⚠️ 保存到安全的地方（比如笔记本）
```

---

## 🔄 Step 2: 更换 Vercel 环境变量

### 2.1 登录 Vercel

```
1. 访问 https://vercel.com/
2. 使用 GitHub 登录（或其他方式）
3. 找到你的项目 "farstand3"
```

### 2.2 更新环境变量

```
1. 点击项目卡片进入项目
2. 点击顶部 "Settings" 标签
3. 左侧菜单点击 "Environment Variables"
4. 找到 "NEYNAR_API_KEY"
5. 点击右侧的三个点 "..." → "Edit"
6. 删除旧的 Key
7. 粘贴新的 API Key
8. 点击 "Save"
```

### 2.3 重新部署

```
⚠️ 重要：更新环境变量后必须重新部署才能生效！

方法 1 - 通过 Vercel 控制台：
1. 回到项目首页
2. 点击 "Deployments" 标签
3. 找到最新的部署（顶部第一个）
4. 点击右侧的三个点 "..." 
5. 选择 "Redeploy"
6. 点击 "Redeploy" 确认
7. 等待 1-2 分钟部署完成

方法 2 - 通过 Git 推送：
1. 本地修改任意文件（比如添加空格）
2. git add .
3. git commit -m "触发重新部署"
4. git push
5. Vercel 会自动检测并重新部署
```

---

## ✅ Step 3: 验证是否成功

### 3.1 测试 API

```
1. 打开浏览器
2. 访问：https://farstand3.vercel.app/api/farcaster?fid=3
3. 应该返回 JSON 数据（包含真实的用户信息）
```

### 3.2 测试 Frame

```
1. 在 Farcaster 客户端（Warpcast）打开你的 Frame
2. 查看数值面板
3. 应该看到：
   ✅ 不再是全 E
   ✅ Details 显示真实数据（不是 "Calculated"）
   ✅ 例如："Power: Score: 95%" 而不是 "Calculated: 460 followers"
```

### 3.3 检查 Neynar 使用量

```
1. 登录新的 Neynar 账号
2. 访问 https://dev.neynar.com/billing
3. 查看 Credits 使用情况
4. 应该显示：
   - 月度额度：5,000,000 credits
   - 已使用：<1% (刚开始使用)
```

---

## 🔍 故障排查

### 问题 1: 更新环境变量后还是不生效

**原因**：没有重新部署

**解决**：
```
1. 确保重新部署了项目（见 Step 2.3）
2. 清除浏览器缓存
3. 等待 2-3 分钟
```

### 问题 2: API 返回 401 Unauthorized

**原因**：API Key 复制错误或无效

**解决**：
```
1. 重新复制 API Key（确保没有空格）
2. 检查是否完整复制（应该很长）
3. 在 Neynar 控制台确认 Key 是 Active 状态
```

### 问题 3: 支付失败

**原因**：信用卡不支持国际支付

**解决**：
```
1. 尝试其他信用卡
2. 联系银行开通国际支付
3. 使用虚拟信用卡（如 Wise、Revolut）
```

### 问题 4: 还是显示降级数据

**原因**：缓存未过期

**解决**：
```
1. 等待 5 分钟（缓存会自动过期）
2. 或者临时禁用缓存进行测试：
   - 在 API URL 后加随机参数
   - https://farstand3.vercel.app/api/farcaster?fid=3&t=12345
```

---

## 📊 成本对比

### 选项 1: 购买 Growth 套餐

| 项目 | 值 |
|------|-----|
| 月度成本 | $9 |
| 年度成本 | $108 |
| 月度额度 | 5M credits |
| 当前消耗（优化后） | ~0.15M (3%) |
| 恢复时间 | 立即 |
| 优势 | ✅ 立即恢复 <br> ✅ 绰绰有余 <br> ✅ 支持更多功能 |

### 选项 2: 等待免费重置

| 项目 | 值 |
|------|-----|
| 月度成本 | $0 |
| 年度成本 | $0 |
| 月度额度 | 1M credits |
| 当前消耗（优化后） | ~0.15M (15%) |
| 恢复时间 | 2025年1月9日 |
| 优势 | ✅ 完全免费 <br> ⚠️ 额度较紧张 |

---

## 💡 推荐建议

### ✅ 推荐购买，如果：

1. **希望立即恢复服务**（不想等24天）
2. **预期用户增长**（免费额度可能不够）
3. **需要更稳定的服务**（不担心超额）
4. **$9/月在预算内**

### ⏰ 推荐等待，如果：

1. **预算紧张**（完全免费）
2. **可以等24天**（1月9日重置）
3. **用户量不大**（优化后免费够用）
4. **降级数据可以接受**（计算的 A/B/C）

---

## 🎯 购买后的优势

购买 Growth 套餐后，你的应用将：

✅ **立即恢复真实数据**
- 不再显示计算数据
- 用户看到真实的 Farcaster 统计

✅ **性能更好**
- 更高的 Rate Limit
- 更快的响应速度

✅ **更多功能**
- 解锁一些高级 API
- 邮件技术支持

✅ **无需担心超额**
- 5M >> 0.15M (33倍余量)
- 即使用户增长 10 倍也够用

---

## 🔐 安全提醒

### ⚠️ 不要在代码中写 API Key！

**❌ 错误做法**：
```typescript
// ❌ 不要这样做！
const NEYNAR_API_KEY = "NEYNAR_API_DOCS_xxxxx";
```

**✅ 正确做法**：
```typescript
// ✅ 从环境变量读取
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
```

### ⚠️ 不要把 API Key 提交到 Git！

检查：
```powershell
# 确保 .env 文件在 .gitignore 中
git status

# 不应该看到 .env 文件
# 如果看到了，立即添加到 .gitignore
```

---

## 📞 需要帮助？

### Neynar 支持
- 文档：https://docs.neynar.com/
- Discord：https://discord.gg/neynar
- 邮件：support@neynar.com（Growth 套餐可用）

### Vercel 支持
- 文档：https://vercel.com/docs
- 社区：https://github.com/vercel/vercel/discussions

---

**完成所有步骤后，你的应用将立即恢复显示真实数据！** 🎉
