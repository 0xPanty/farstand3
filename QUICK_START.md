# ⚡ Quick Start: Base Chain Free Mint Setup

## 🎯 目标
为你的 JoJo Stand Maker 添加 Base 链 NFT Mint 功能（Free Mint，用户只支付 gas）

---

## 📦 我已经为你创建的文件

✅ **智能合约:**
- `contracts/StandNFT.sol` - ERC-721 NFT 合约
- `contracts/hardhat.config.js` - Hardhat 配置
- `contracts/package.json` - 合约依赖
- `contracts/scripts/deploy.js` - 部署脚本

✅ **后端 API:**
- `api/upload-metadata.ts` - IPFS 元数据上传

✅ **前端服务:**
- `services/mintService.ts` - Mint 功能集成

✅ **文档:**
- `DEPLOYMENT.md` - 完整部署指南
- `MINT_INTEGRATION_GUIDE.md` - App.tsx 集成指南
- `QUICK_START.md` - 你正在看的快速启动指南

---

## 🚀 3 步完成部署

### 第 1 步: 获取 API Keys（5 分钟）

#### 1.1 Pinata (IPFS 存储)
1. 访问 https://app.pinata.cloud/
2. 注册免费账户
3. API Keys → New Key
4. 启用 `pinFileToIPFS` 和 `pinJSONToIPFS`
5. 复制 `API Key` 和 `Secret Key`

#### 1.2 准备部署钱包
⚠️ **使用新钱包，不要用主钱包！**
1. 创建新钱包或使用测试钱包
2. 导出私钥
3. 在 Base 上准备 ~$5 USD ETH（用于部署）
   - 桥接地址: https://bridge.base.org

---

### 第 2 步: 部署智能合约（10 分钟）

#### 2.1 安装依赖
```bash
cd contracts
npm install
cd ..
```

#### 2.2 配置环境变量
在项目根目录创建 `.env` 文件：

```bash
# Contract Deployment
DEPLOYER_PRIVATE_KEY=your_private_key_here
BASESCAN_API_KEY=optional_for_verification

# IPFS (Pinata)
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key

# Existing Keys
VITE_GEMINI_API_KEY=your_existing_gemini_key
VITE_NEYNAR_API_KEY=your_existing_neynar_key

# Will be filled after deployment
VITE_STAND_NFT_CONTRACT=
```

#### 2.3 部署到 Base 测试网（推荐先测试）
```bash
cd contracts
npm run deploy:baseSepolia
```

#### 2.4 部署到 Base 主网
```bash
npm run deploy:base
```

**输出示例:**
```
🚀 Deploying StandNFT to Base...
✅ StandNFT deployed to: 0x1234567890abcdef...
📝 Save this address to your .env file:
VITE_STAND_NFT_CONTRACT=0x1234567890abcdef...
```

#### 2.5 保存合约地址
将合约地址添加到 `.env`:
```bash
VITE_STAND_NFT_CONTRACT=0x你的合约地址
```

---

### 第 3 步: 集成前端（15 分钟）

#### 3.1 按照 `MINT_INTEGRATION_GUIDE.md` 操作

简要步骤：
1. 在 `App.tsx` 顶部添加 import
2. 添加 mint 相关的 state
3. 添加 `handleMint` 函数
4. 在 Stand 卡片下方添加 Mint 按钮 UI
5. 在 `index.html` 添加 shimmer 动画

**详细代码请查看 `MINT_INTEGRATION_GUIDE.md`！**

#### 3.2 更新 Vercel 环境变量
1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. 添加：
   ```
   PINATA_API_KEY=...
   PINATA_SECRET_KEY=...
   VITE_STAND_NFT_CONTRACT=0x你的合约地址
   ```
3. 保存并重新部署

#### 3.3 提交代码
```bash
git add .
git commit -m "feat: add Base Chain NFT mint functionality"
git push
```

---

## 🧪 测试

### 本地测试
```bash
npm run dev
```
1. 生成 Stand
2. 点击 "MINT STAND NFT"
3. 确认钱包交易

### Warpcast 测试
1. 打开 Mini App
2. 生成 Stand
3. 点击 Mint
4. 在 Farcaster 钱包中确认
5. 检查 BaseScan: https://basescan.org/address/你的合约地址

---

## 💰 费用估算

- **合约部署**: ~$2-5 USD（一次性）
- **每次 Mint**: ~$0.20-1 USD gas（**用户支付**）
- **IPFS 存储**: 免费（Pinata 免费 1GB）

**总启动成本: ~$2-5 USD**

---

## 🎯 合约功能特性

✅ ERC-721 标准  
✅ Free Mint（用户只付 gas）  
✅ 每个 FID 限制 1 次 mint（防止滥用）  
✅ 最大供应量 10,000  
✅ 元数据存储在 IPFS  
✅ OpenSea 兼容  
✅ Base 链（低 gas 费）

---

## 📖 完整文档

- **DEPLOYMENT.md** - 详细部署步骤和故障排除
- **MINT_INTEGRATION_GUIDE.md** - 前端集成代码
- **合约源码** - `contracts/StandNFT.sol`

---

## 🆘 常见问题

### Q: 部署失败 "Insufficient funds"
A: 确保钱包有足够的 Base ETH（~$5 USD）

### Q: Mint 按钮没显示
A: 检查是否成功生成了 Stand（`standData` 不为空）

### Q: 交易失败
A: 可能已经 mint 过了（每个 FID 只能 mint 1 次）

### Q: IPFS 上传失败
A: 检查 Vercel 环境变量中的 Pinata keys

### Q: 如何验证合约？
A: 
```bash
cd contracts
npx hardhat verify --network base 你的合约地址
```

---

## 🎉 完成后你将拥有：

✅ 部署在 Base 链上的 Stand NFT 合约  
✅ IPFS 元数据存储  
✅ 完整的 Mint 功能  
✅ Farcaster 钱包集成  
✅ 用户可以在 Warpcast 中一键 Mint

---

## 🔗 有用链接

- **Base 桥接**: https://bridge.base.org
- **BaseScan**: https://basescan.org
- **Pinata Dashboard**: https://app.pinata.cloud
- **OpenSea (Base)**: https://opensea.io/assets/base/你的合约地址
- **Farcaster Docs**: https://docs.farcaster.xyz

---

## 📞 需要帮助？

如果遇到问题：
1. 查看 `DEPLOYMENT.md` 的故障排除部分
2. 检查浏览器控制台错误
3. 查看 Vercel 部署日志
4. 检查 BaseScan 交易详情

---

🚀 **开始部署吧！预计总时间: 30 分钟**
