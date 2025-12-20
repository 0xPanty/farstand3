# 🔄 快速恢复脚本
# 如果1月9日后想恢复到原始版本（不推荐）

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Farstand API 版本切换工具" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  警告：通常不需要执行此操作！" -ForegroundColor Red
Write-Host "   当前优化版会自动在1月9日后使用真实数据" -ForegroundColor Yellow
Write-Host ""

$choice = Read-Host "确定要继续吗？(yes/no)"

if ($choice -ne "yes") {
    Write-Host "✅ 已取消操作" -ForegroundColor Green
    exit
}

Write-Host ""
Write-Host "请选择要切换的版本：" -ForegroundColor Cyan
Write-Host "1. 恢复原始版本（无降级，高消耗）" -ForegroundColor Yellow
Write-Host "2. 恢复优化版本（智能降级，低消耗）← 推荐" -ForegroundColor Green
Write-Host "3. 取消" -ForegroundColor Gray
Write-Host ""

$version = Read-Host "请输入选项 (1/2/3)"

switch ($version) {
    "1" {
        Write-Host ""
        Write-Host "⚠️  恢复原始版本会导致：" -ForegroundColor Red
        Write-Host "   - 移除降级保护" -ForegroundColor Yellow
        Write-Host "   - API 消耗增加 10 倍" -ForegroundColor Yellow
        Write-Host "   - 可能再次超额" -ForegroundColor Yellow
        Write-Host ""
        
        $confirm = Read-Host "确认恢复原始版本？(yes/no)"
        if ($confirm -eq "yes") {
            # 备份当前版本
            Copy-Item api\farcaster.ts api\farcaster-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').ts
            
            # 恢复原始版本
            Copy-Item api\farcaster.ts.old api\farcaster.ts -Force
            
            Write-Host ""
            Write-Host "✅ 已恢复原始版本" -ForegroundColor Green
            Write-Host ""
            Write-Host "现在需要提交：" -ForegroundColor Yellow
            Write-Host "  git add api/farcaster.ts" -ForegroundColor Gray
            Write-Host "  git commit -m '恢复原始版本'" -ForegroundColor Gray
            Write-Host "  git push" -ForegroundColor Gray
            Write-Host ""
            
            $push = Read-Host "立即提交并部署？(yes/no)"
            if ($push -eq "yes") {
                git add api/farcaster.ts
                git commit -m "恢复原始版本（无降级方案）"
                git push
                Write-Host ""
                Write-Host "✅ 已部署！等待 1-2 分钟生效" -ForegroundColor Green
            }
        } else {
            Write-Host "✅ 已取消" -ForegroundColor Green
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "恢复优化版本..." -ForegroundColor Green
        
        # 恢复优化版本
        Copy-Item api\farcaster-optimized.ts api\farcaster.ts -Force
        
        Write-Host "✅ 已恢复优化版本" -ForegroundColor Green
        Write-Host ""
        Write-Host "现在需要提交：" -ForegroundColor Yellow
        Write-Host "  git add api/farcaster.ts" -ForegroundColor Gray
        Write-Host "  git commit -m '恢复优化版本'" -ForegroundColor Gray
        Write-Host "  git push" -ForegroundColor Gray
        Write-Host ""
        
        $push = Read-Host "立即提交并部署？(yes/no)"
        if ($push -eq "yes") {
            git add api/farcaster.ts
            git commit -m "恢复优化版本（智能降级）"
            git push
            Write-Host ""
            Write-Host "✅ 已部署！等待 1-2 分钟生效" -ForegroundColor Green
        }
    }
    
    "3" {
        Write-Host "✅ 已取消" -ForegroundColor Green
    }
    
    default {
        Write-Host "❌ 无效选项" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  完成" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
