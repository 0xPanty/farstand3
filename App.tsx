
"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Plus, X, RotateCcw, Zap, Triangle, Sparkles, Crosshair, ArrowRight, ArrowLeft } from "lucide-react";
import { sdk } from "@farcaster/miniapp-sdk";
import { analyzeUserAndGenerateStand } from "./services/geminiService";
import { fetchFarcasterUser, calculateFarcasterStats } from "./services/farcasterService";
import { StandResult, StatValue, StandStats, FarcasterProfile, StandStatRawValues } from "./types";

// ==========================================
// Helper: Radar Chart Component (Stats Panel)
// ==========================================
const RadarChart: React.FC<{ stats: StandStats }> = ({ stats }) => {
  // Dimensions
  const containerSize = 400; 
  const circleSize = 200;    
  const center = containerSize / 2;
  const radius = 95;         
  
  const keys = ["power", "speed", "range", "durability", "precision", "potential"];
  const jpLabels = ["破壊力", "速度", "射程", "持続力", "精密", "成長"];
  
  const gradeToVal = (g: StatValue) => {
    const map: Record<string, number> = { 'A': 1.0, 'B': 0.8, 'C': 0.6, 'D': 0.4, 'E': 0.2, 'N/A': 0 };
    return map[g] || 0;
  };

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
    const x = center + radius * value * Math.cos(angle);
    const y = center + radius * value * Math.sin(angle);
    return `${x},${y}`;
  };

  const polyPoints = keys.map((k, i) => getPoint(i, gradeToVal(stats[k as keyof StandStats]))).join(" ");

  return (
    <div className="relative flex items-center justify-center scale-90 md:scale-100" style={{ width: containerSize, height: containerSize }}>
      
      {/* 1. Black Background Circle (Centered) */}
      <div 
        className="absolute bg-[#121212] rounded-full border-[2px] border-gray-700 shadow-inner"
        style={{ width: circleSize, height: circleSize, left: (containerSize - circleSize) / 2, top: (containerSize - circleSize) / 2 }}
      />

      {/* 2. SVG Overlay for Data */}
      <svg width={containerSize} height={containerSize} className="absolute inset-0 z-10 pointer-events-none">
        {/* Grids */}
        {[0.5, 1].map((r, i) => (
           <polygon key={i} points={keys.map((_, idx) => getPoint(idx, r)).join(" ")} fill="none" stroke="#333" strokeWidth="1" strokeDasharray="4 2" />
        ))}
        {/* Axes */}
        {keys.map((_, i) => {
           const end = getPoint(i, 1);
           return <line key={i} x1={center} y1={center} x2={end.split(',')[0]} y2={end.split(',')[1]} stroke="#333" strokeWidth="1" />
        })}
        {/* Data Shape */}
        <polygon points={polyPoints} fill="rgba(219, 39, 119, 0.5)" stroke="#db2777" strokeWidth="2" />
        {/* Vertices dots */}
        {keys.map((k, i) => {
             const val = gradeToVal(stats[k as keyof StandStats]);
             const pt = getPoint(i, val);
             return <circle key={i} cx={pt.split(',')[0]} cy={pt.split(',')[1]} r="4" fill="#db2777" stroke="#000" strokeWidth="1" />
        })}
      </svg>

      {/* 3. Labels (Outside the circle) */}
      {keys.map((label, i) => {
         const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
         // Push labels out further so they don't overlap the circle or the chart
         const dist = (circleSize / 2) + 50; 
         const x = center + dist * Math.cos(angle);
         const y = center + dist * Math.sin(angle);
         
         const style: React.CSSProperties = {
             left: `${x}px`,
             top: `${y}px`,
             transform: 'translate(-50%, -50%)',
         };
         
         return (
            <div key={i} className="absolute z-20 flex flex-col items-center justify-center" style={style}>
                <span className="text-xl font-black text-[#fbbf24] bg-black px-3 py-1 rounded-sm shadow-[2px_2px_0_rgba(0,0,0,0.3)] whitespace-nowrap border border-[#fbbf24]/30">
                    {jpLabels[i]}
                </span>
                <span className="text-xs font-bold text-slate-600 uppercase mt-1 tracking-wider">{label}</span>
            </div>
         );
      })}
    </div>
  );
};

// ==========================================
// Helper: Stat Circle (Manga Style)
// ==========================================
interface StatCircleProps {
    label: string; 
    subLabel: string; 
    value: StatValue;
    detail?: string;
}

const StatCircle: React.FC<StatCircleProps> = ({ label, subLabel, value, detail }) => {
    const isHigh = value === 'A' || value === 'B';
    const borderColor = isHigh ? 'border-[#db2777]' : 'border-gray-800';
    const textColor = isHigh ? 'text-[#db2777]' : 'text-black';
    
    return (
        <div className="flex flex-col items-center justify-center transform hover:scale-110 transition-transform duration-300">
            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full border-[4px] ${borderColor} flex items-center justify-center bg-white shadow-[4px_4px_0_rgba(0,0,0,0.1)] mb-2`}>
                <span className={`text-3xl md:text-4xl font-black italic font-jojo leading-none ${textColor}`}>{value}</span>
            </div>
            <div className="flex flex-col items-center leading-none">
                 <span className="text-xs md:text-sm font-black text-black">{label}</span>
                 <span className="text-[8px] md:text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">{subLabel}</span>
                 {detail ? (
                    <span className="text-[8px] md:text-[10px] font-bold text-[#3b82f6] font-mono mt-1 whitespace-nowrap tracking-tight bg-blue-50 px-1 rounded">{detail}</span>
                 ) : (
                    <span className="h-4 mt-1"></span>
                 )}
            </div>
        </div>
    );
}

// ==========================================
// Component: Menacing Floating Text
// ==========================================
const MenacingFloaters = () => {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
            <div className="absolute top-[10%] left-[10%] text-[#ec4899] font-black text-5xl animate-float-menacing menacing-text" style={{ animationDelay: '0s' }}>ゴ</div>
            <div className="absolute top-[40%] right-[15%] text-[#a855f7] font-black text-6xl animate-float-menacing menacing-text" style={{ animationDelay: '1.2s' }}>ゴ</div>
            <div className="absolute bottom-[20%] left-[20%] text-[#ec4899] font-black text-4xl animate-float-menacing menacing-text" style={{ animationDelay: '0.5s' }}>ゴ</div>
            <div className="absolute top-[15%] right-[25%] text-[#8b5cf6] font-black text-3xl animate-float-menacing menacing-text" style={{ animationDelay: '2.5s' }}>ド</div>
            <div className="absolute bottom-[10%] right-[5%] text-[#ec4899] font-black text-7xl animate-float-menacing menacing-text" style={{ animationDelay: '1.8s' }}>ゴ</div>
        </div>
    );
};

// ==========================================
// Component: JOJO Style Printer (Stand Data Printer)
// ==========================================
interface StandPrinterProps {
    user: FarcasterProfile | null;
    stats: StandStats | null;
    statDetails?: StandStatRawValues;
    standName?: string;
    standImageUrl?: string;
    sketchImageUrl?: string;
}

const StandPrinter: React.FC<StandPrinterProps> = ({ user, stats, statDetails, standName, standImageUrl, sketchImageUrl }) => {
    const [isPrinting, setIsPrinting] = useState(false);
    const [showPaper, setShowPaper] = useState(false);
    const [printText, setPrintText] = useState("");
    
    // Calculate total score
    const gradeToScore = (g: StatValue): number => {
        const map: Record<string, number> = { 'A': 100, 'B': 80, 'C': 60, 'D': 40, 'E': 20, 'N/A': 0 };
        return map[g] || 0;
    };
    
    const totalScore = stats ? (
        gradeToScore(stats.power) + 
        gradeToScore(stats.speed) + 
        gradeToScore(stats.range) + 
        gradeToScore(stats.durability) + 
        gradeToScore(stats.precision) + 
        gradeToScore(stats.potential)
    ) : 0;
    
    const getRank = (score: number): string => {
        if (score >= 540) return 'S';
        if (score >= 450) return 'A';
        if (score >= 360) return 'B';
        if (score >= 270) return 'C';
        if (score >= 180) return 'D';
        return 'E';
    };
    
    // Star rating (1-5 stars based on score)
    const getStars = (score: number): string => {
        const starCount = Math.ceil((score / 600) * 5);
        const filled = '★'.repeat(starCount);
        const empty = '☆'.repeat(5 - starCount);
        return filled + empty;
    };

    const fullText = user ? `@${user.username}
${user.displayName}${user.powerBadge ? ' ⚡' : ''}
${user.verifications.length > 0 ? user.verifications[0].slice(0, 6) + '...' + user.verifications[0].slice(-4) : ''}
${standName ? `─────────────────────────
『${standName.replace(/[『』]/g, '')}』
` : ''}─────────────────────────
Followers ${user.followerCount.toLocaleString().padStart(8)}
Following ${user.followingCount.toLocaleString().padStart(8)}
Casts     ${user.castCount.toLocaleString().padStart(8)}
Likes     ${(user.likesReceived || 0).toLocaleString().padStart(8)}
Recasts   ${(user.recastsReceived || 0).toLocaleString().padStart(8)}
${stats && statDetails ? `═════════════════════════
    STAND PARAMETERS
═════════════════════════
POWER      ${stats.power}  ${statDetails.power || ''}
SPEED      ${stats.speed}  ${statDetails.speed || ''}
RANGE      ${stats.range}  ${statDetails.range || ''}
DURABILITY ${stats.durability}  ${statDetails.durability || ''}
PRECISION  ${stats.precision}  ${statDetails.precision || ''}
POTENTIAL  ${stats.potential}  ${statDetails.potential || ''}
***************************
Rating ${getStars(totalScore)}
SCORE  ${totalScore}/600  RANK ${getRank(totalScore)}` : ''}
`.trim() : 'NO DATA...';

    const handlePrint = () => {
        if (isPrinting || !user) return;
        setIsPrinting(true);
        setShowPaper(true);
        setPrintText("");
        
        // Typewriter effect - print character by character
        let i = 0;
        const interval = setInterval(() => {
            if (i < fullText.length) {
                setPrintText(fullText.slice(0, i + 1));
                i++;
            } else {
                clearInterval(interval);
                setTimeout(() => {
                    setIsPrinting(false);
                }, 300);
            }
        }, 15); // Speed: 15ms per character
    };

    const handleReset = () => {
        setShowPaper(false);
        setPrintText("");
    };

    return (
        <div className="relative flex flex-col items-center">
            {/* Printer Body */}
            <div className="relative">
                {/* Main Frame - Premium metallic style */}
                <div className="w-80 bg-gradient-to-b from-[#2a2a2a] via-[#1a1a1a] to-[#0a0a0a] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_60px_rgba(251,191,36,0.15),inset_0_1px_0_rgba(255,255,255,0.1)] border border-[#444] overflow-hidden">
                    
                    {/* Top Bar - Brushed metal */}
                    <div className="h-10 bg-gradient-to-b from-[#3a3a3a] via-[#2a2a2a] to-[#1a1a1a] flex items-center justify-between px-4 border-b border-[#555] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                        <span className="text-[#fbbf24] font-black text-[10px] tracking-[0.2em] drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">STAND-PRINTER</span>
                        <div className="flex gap-2 items-center">
                            <div className="w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_6px_#22c55e]"></div>
                            <div className="w-2 h-2 rounded-full bg-[#333] border border-[#555]"></div>
                        </div>
                    </div>
                    
                    {/* Screen Area */}
                    <div className="p-4">
                        <div className="bg-[#0a0a0a] border border-[#333] rounded-lg p-4 h-28 overflow-hidden relative shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
                            {/* CRT glow effect */}
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(219,39,119,0.05)_0%,transparent_70%)] pointer-events-none"></div>
                            {/* Scan line effect */}
                            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_3px] pointer-events-none opacity-50"></div>
                            
                            {/* Screen content */}
                            <div className="font-mono text-xs leading-relaxed relative z-10">
                                {user ? (
                                    <>
                                        <div className="text-[#22c55e] mb-2 flex items-center gap-2">
                                            <span className="inline-block w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-pulse"></span>
                                            USER DETECTED
                                        </div>
                                        <div className="text-[#fbbf24] font-bold">@{user.username}</div>
                                        <div className="text-[#666] text-[10px]">FID: #{user.fid}</div>
                                        <div className="text-[#06b6d4] text-[10px] mt-2 animate-pulse tracking-wider">▶ READY TO PRINT...</div>
                                    </>
                                ) : (
                                    <div className="text-[#666] animate-pulse">CONNECTING...</div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Control Panel */}
                    <div className="px-4 pb-4 flex items-center justify-between">
                        {/* Reset Button */}
                        <button 
                            onClick={handleReset}
                            className="w-12 h-12 bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] border border-[#444] rounded-xl flex items-center justify-center hover:border-[#fbbf24] transition-all active:scale-95 shadow-[0_4px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]"
                        >
                            <RotateCcw className="w-4 h-4 text-[#888]" />
                        </button>
                        
                        {/* Speaker Grille */}
                        <div className="flex flex-col gap-1 px-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="w-20 h-[2px] bg-gradient-to-r from-transparent via-[#333] to-transparent rounded"></div>
                            ))}
                        </div>
                        
                        {/* Print Button */}
                        <button 
                            onClick={handlePrint}
                            disabled={isPrinting || !user}
                            className={`px-5 py-3 font-black text-xs tracking-wider rounded-xl transition-all active:scale-95 ${
                                isPrinting 
                                    ? 'bg-[#333] text-[#666] cursor-not-allowed' 
                                    : 'bg-gradient-to-b from-[#fbbf24] to-[#b45309] text-black shadow-[0_4px_12px_rgba(251,191,36,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_6px_20px_rgba(251,191,36,0.6)] hover:-translate-y-0.5'
                            }`}
                        >
                            {isPrinting ? 'PRINTING...' : 'PRINT'}
                        </button>
                    </div>
                    
                    {/* Paper Slot */}
                    <div className="h-4 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] border-t border-[#333] relative overflow-visible">
                        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-52 h-2 bg-[#0a0a0a] rounded-b-lg shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]"></div>
                    </div>
                </div>
                
                {/* Printed Paper - Japanese Receipt Style */}
                {showPaper && (
                    <div 
                        className="absolute left-1/2 -translate-x-1/2 w-72 overflow-hidden"
                        style={{ 
                            top: '100%',
                            transformOrigin: 'top center',
                            maxHeight: isPrinting ? `${Math.min(printText.split('\n').length * 16 + 200, 800)}px` : '800px',
                            transition: 'max-height 0.1s linear',
                        }}
                    >
                        {/* Paper with thermal print texture */}
                        <div className="relative bg-[#f8f8f5] shadow-[0_15px_50px_rgba(0,0,0,0.5)]"
                             style={{
                                 backgroundImage: `
                                     url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='5'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E"),
                                     linear-gradient(to bottom, rgba(0,0,0,0.015) 0%, transparent 1%, transparent 99%, rgba(0,0,0,0.02) 100%)
                                 `,
                             }}
                        >
                            {/* Thermal paper texture - horizontal lines */}
                            <div className="absolute inset-0 opacity-[0.15]" style={{
                                backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 3px)`
                            }}></div>
                            {/* Slight ink bleed effect */}
                            <div className="absolute inset-0 mix-blend-multiply opacity-[0.02]" style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n2'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.5' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n2)'/%3E%3C/svg%3E")`
                            }}></div>
                            
                            {/* Close button */}
                            <button 
                                onClick={handleReset}
                                className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center text-[#aaa] hover:text-[#333] transition-colors z-20 text-xs"
                            >
                                ✕
                            </button>
                            
                            {/* Receipt Content */}
                            <div className="px-4 py-3 relative">
                                
                                {/* Header Logo - Thermal ink style */}
                                <div className="text-center mb-2 pb-2 border-b border-dashed border-[#bbb]">
                                    <div className="relative inline-block">
                                        <h1 className="text-xl font-black tracking-[0.15em] text-[#1a1a1a] relative"
                                            style={{ 
                                                fontFamily: "'Courier New', 'MS Gothic', monospace",
                                                fontWeight: 900,
                                                textShadow: '0.5px 0.5px 0 rgba(0,0,0,0.15), -0.2px -0.2px 0 rgba(255,255,255,0.5)',
                                                letterSpacing: '0.2em',
                                            }}>
                                            STAND DATA
                                        </h1>
                                    </div>
                                    <div className="text-[7px] text-[#888] mt-1 tracking-[0.25em]" 
                                         style={{ fontFamily: "'Courier New', monospace" }}>
                                        SPEEDWAGON FOUNDATION
                                    </div>
                                </div>
                                
                                {/* Date & ID line */}
                                <div className="flex justify-between text-[9px] text-[#555] font-mono mb-2 pb-1 border-b border-dotted border-[#ddd]">
                                    <span>{new Date().toLocaleDateString('ja-JP').replace(/\//g, '/')} {new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span>No.{user?.fid?.toString().padStart(6, '0') || '------'}</span>
                                </div>
                                
                                {/* Content with optional Stand image */}
                                <div className="flex gap-2">
                                    {/* Left: Text content - Thermal printer ink style */}
                                    <div className={`text-[10px] leading-[1.6] font-mono text-[#1a1a1a] whitespace-pre-wrap ${standImageUrl ? 'flex-1' : 'w-full'}`}
                                         style={{ 
                                             fontFamily: "'Courier New', 'MS Gothic', monospace",
                                             fontWeight: 500,
                                             letterSpacing: '-0.3px',
                                             textShadow: '0.3px 0 0 rgba(0,0,0,0.2), -0.3px 0 0 rgba(0,0,0,0.1)',
                                             filter: 'contrast(1.1)',
                                         }}>
                                        {printText}
                                        {isPrinting && <span className="animate-blink text-[#333]">█</span>}
                                    </div>
                                    
                                    {/* Right: Stand User sketch (pencil style for receipt) */}
                                    {(sketchImageUrl || standImageUrl) && !isPrinting && printText && (
                                        <div className="w-32 shrink-0 relative ml-2">
                                            <div className="border border-[#999] bg-white">
                                                <img 
                                                    src={sketchImageUrl || standImageUrl} 
                                                    alt="Stand User"
                                                    className="w-full h-auto object-contain"
                                                    style={{
                                                        filter: sketchImageUrl ? 'contrast(1.1)' : 'grayscale(100%) contrast(1.3) brightness(1.05)',
                                                        mixBlendMode: 'multiply',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Footer */}
                                {!isPrinting && printText && (
                                    <div className="mt-3 pt-2 border-t border-dashed border-[#ccc]">
                                        {/* Barcode generated from hash - Code 128 style */}
                                        {(() => {
                                            const hashSource = user?.verifications?.[0] || user?.fid?.toString() || '0x0000000000000000';
                                            const hashClean = hashSource.replace('0x', '');
                                            // Generate Code 128 style pattern (thin and thick bars)
                                            const barPattern: { w: number; gap: boolean }[] = [];
                                            for (let i = 0; i < 50; i++) {
                                                const c = hashClean[i % hashClean.length];
                                                const v = parseInt(c, 16);
                                                const width = isNaN(v) ? 2 : (v % 4) + 1;
                                                barPattern.push({ w: width, gap: false });
                                                // Add gap after bar
                                                const gapWidth = ((v || 0) % 3) + 1;
                                                barPattern.push({ w: gapWidth, gap: true });
                                            }
                                            return (
                                                <div className="flex items-center h-14 w-full mb-2">
                                                    {barPattern.map((bar, i) => (
                                                        <div 
                                                            key={i} 
                                                            className={bar.gap ? 'bg-transparent' : 'bg-[#1a1a1a]'}
                                                            style={{ width: `${bar.w}px`, height: '100%' }}
                                                        ></div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                        
                                        {/* Hash value */}
                                        <p className="text-center text-[8px] text-[#555] font-mono tracking-wider mb-2">
                                            {user?.verifications?.[0] 
                                                ? `${user.verifications[0].slice(0, 10)}...${user.verifications[0].slice(-8)}`
                                                : user?.fid?.toString() || '------'}
                                        </p>
                                        
                                        {/* Mint Info */}
                                        <div className="border-t border-dotted border-[#ccc] pt-2">
                                            <div className="flex justify-between text-[9px] font-mono">
                                                <span className="text-[#666]">MINT FEE</span>
                                                <span className="text-[#333] font-bold">FREE</span>
                                            </div>
                                        </div>
                                        
                                        {/* Credit - single line */}
                                        <div className="text-center border-t border-dotted border-[#ccc] pt-2 mt-2">
                                            <p className="text-[8px] text-[#888]">Created by <span className="font-bold text-[#555]">@misa</span></p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Torn edge effect */}
                        <svg className="w-full h-3" viewBox="0 0 288 12" preserveAspectRatio="none">
                            <path d="M0,0 L288,0 L288,3 Q280,6 272,3 Q264,0 256,3 Q248,6 240,3 Q232,0 224,3 Q216,6 208,3 Q200,0 192,3 Q184,6 176,3 Q168,0 160,3 Q152,6 144,3 Q136,0 128,3 Q120,6 112,3 Q104,0 96,3 Q88,6 80,3 Q72,0 64,3 Q56,6 48,3 Q40,0 32,3 Q24,6 16,3 Q8,0 0,3 Z" 
                                  fill="#f5f5f0"/>
                        </svg>
                        
                        {/* SVG Filter for ink effect */}
                        <svg width="0" height="0">
                            <filter id="ink-bleed">
                                <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise"/>
                                <feDisplacementMap in="SourceGraphic" in2="noise" scale="1" xChannelSelector="R" yChannelSelector="G"/>
                            </filter>
                        </svg>
                    </div>
                )}
            </div>
            
            {/* Brand label */}
            <div className="mt-4 text-[#555] text-[8px] font-medium tracking-[0.2em]">SPW FOUNDATION TECH</div>
            
            {/* Styles */}
            <style>{`
                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                }
                .animate-blink {
                    animation: blink 0.5s infinite;
                }
            `}</style>
        </div>
    );
};

// ==========================================
// Component: Farcaster Gate Background (Enhanced)
// ==========================================
const FarcasterGateBackground = () => {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
             
             {/* 1. Rotating Ambient Beams (The "Breathing Flash/Glow") */}
             {/* Reduced opacity to 0.2 to allow the checkerboard to shine through */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vmax] h-[150vmax] animate-[spin_20s_linear_infinite] opacity-20">
                <div className="w-full h-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(76,29,149,0.3)_60deg,transparent_120deg,transparent_180deg,rgba(219,39,119,0.2)_240deg,transparent_300deg)] blur-3xl"></div>
             </div>

             {/* 2. Marquee / Scanner Effect (The "Running Light") */}
             <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_20%,rgba(255,255,255,0.03)_40%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.03)_60%,transparent_80%)] bg-[length:200%_100%] animate-marquee-shimmer mix-blend-overlay"></div>

             {/* 3. Central Gate Logo & Deep Pulse */}
             <div className="absolute inset-0 flex items-center justify-center">
                 {/* Deep Pulse Center */}
                 <div className="absolute w-[80vw] h-[80vw] bg-[#4c1d95] rounded-full blur-[120px] opacity-20 animate-pulse-slow mix-blend-screen"></div>
                 
                 {/* Gate SVG */}
                 <svg 
                    viewBox="0 0 200 200" 
                    className="w-[90vmin] h-[90vmin] text-[#855DCD] opacity-10 blur-md transform scale-110 drop-shadow-[0_0_50px_rgba(133,93,205,0.4)]"
                 >
                    {/* Stylized Arch / Gate Shape */}
                    <path 
                        fill="currentColor" 
                        d="M30 50 H170 V80 H150 V170 H120 V120 C120 105 100 105 100 120 V170 H70 V80 H50 V170 H50 V80 H30 Z"
                    />
                 </svg>
             </div>

             <style>{`
                @keyframes marquee-shimmer {
                    0% { background-position: 150% 0; }
                    100% { background-position: -50% 0; }
                }
                .animate-marquee-shimmer {
                    animation: marquee-shimmer 8s linear infinite;
                }
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.15; transform: scale(1); }
                    50% { opacity: 0.25; transform: scale(1.05); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 6s ease-in-out infinite;
                }
             `}</style>
        </div>
    );
};

// ==========================================
// Component: Loading Screen
// ==========================================
const LoadingScreen = () => {
    return (
        <div className="w-full h-full absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0f0015] pattern-checkers overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none"></div>

            <div className="flex gap-4 mb-16 relative z-10">
                <span className="text-[#db2777] font-black text-6xl md:text-8xl menacing-text animate-rumble" style={{ animationDelay: '0s' }}>ゴ</span>
                <span className="text-[#db2777] font-black text-6xl md:text-8xl menacing-text animate-rumble" style={{ animationDelay: '0.1s' }}>ゴ</span>
                <span className="text-[#db2777] font-black text-6xl md:text-8xl menacing-text animate-rumble" style={{ animationDelay: '0.2s' }}>ゴ</span>
            </div>

            <div className="w-64 border-2 border-[#701a75] bg-black/80 rounded-lg p-3 shadow-[0_0_20px_rgba(112,26,117,0.5)] relative z-10">
                <div className="w-full h-2 bg-gray-900 rounded-full mb-2 overflow-hidden border border-gray-700">
                    <div className="h-full w-full bg-gradient-to-r from-[#701a75] via-[#db2777] to-[#eab308] animate-[shimmer_2s_linear_infinite]" style={{ backgroundSize: '200% 100%' }}></div>
                </div>
                <p className="text-[#eab308] font-serif font-bold text-[10px] tracking-widest text-center animate-pulse">
                    AWAKENING STAND....
                </p>
            </div>
            <style>{` @keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } } `}</style>
        </div>
    );
};

// ==========================================
// Component: Printer View (Stand Data Printer Page)
// ==========================================
interface PrinterViewProps {
    onBack: () => void;
    user: FarcasterProfile | null;
    stats: StandStats | null;
    statDetails?: StandStatRawValues;
    standName?: string;
    standImageUrl?: string;
    sketchImageUrl?: string;
}

const PrinterView: React.FC<PrinterViewProps> = ({ onBack, user, stats, statDetails, standName, standImageUrl, sketchImageUrl }) => {
    return (
        <main className="h-dvh w-screen bg-black bg-noise pattern-flowing-checkers flex flex-col relative overflow-hidden" 
              style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
             
             {/* Background */}
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.1)_0%,transparent_70%)] pointer-events-none"></div>
             
             {/* Menacing floaters */}
             <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                <div className="absolute top-[15%] left-[5%] text-[#db2777] font-black text-4xl menacing-text animate-pulse">ゴ</div>
                <div className="absolute top-[25%] right-[8%] text-[#fbbf24] font-black text-3xl menacing-text animate-pulse" style={{ animationDelay: '0.5s' }}>ゴ</div>
                <div className="absolute bottom-[30%] left-[10%] text-[#db2777] font-black text-5xl menacing-text animate-pulse" style={{ animationDelay: '1s' }}>ド</div>
             </div>
             
             {/* Back Arrow */}
             <div className="absolute top-4 left-4 z-50">
                <button 
                    onClick={onBack}
                    className="flex items-center gap-2 text-[#fbbf24] hover:text-[#db2777] transition-colors group px-4 py-2"
                >
                    <ArrowLeft className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold tracking-widest text-xs uppercase">Return</span>
                </button>
             </div>
             
             {/* Header */}
             <div className="mt-16 text-center z-20">
                 <h1 className="text-3xl md:text-4xl font-jojo text-white drop-shadow-[2px_2px_0_#db2777]">
                    STAND<span className="text-[#fbbf24]">-PRINTER</span>
                 </h1>
                 <p className="text-[10px] text-[#666] tracking-widest mt-2">SPEEDWAGON FOUNDATION TECHNOLOGY</p>
             </div>
             
             {/* Printer Component */}
             <div className="flex-1 flex items-center justify-center relative z-20 overflow-y-auto py-8">
                 <StandPrinter user={user} stats={stats} statDetails={statDetails} standName={standName} standImageUrl={standImageUrl} sketchImageUrl={sketchImageUrl} />
             </div>
        </main>
    );
};

// ==========================================
// Main Application
// ==========================================
export default function App() {
  const [preview, setPreview] = useState<string | null>(null);
  const [standData, setStandData] = useState<StandResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Navigation State
  const [showInteraction, setShowInteraction] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);

  // Farcaster State
  const [farcasterUser, setFarcasterUser] = useState<FarcasterProfile | null>(null);
  const [calculatedData, setCalculatedData] = useState<{ stats: StandStats; details: StandStatRawValues } | null>(null);

  // Farcaster Frame Logic
  useEffect(() => {
    const init = async () => {
        try {
            // Signal to Farcaster client that the frame is ready to display
            await sdk.actions.ready();
            
            // Context Logic
            const context = await sdk.context;
            if (context?.user?.fid) {
                const profile = await fetchFarcasterUser(context.user.fid);
                if (profile) {
                   setFarcasterUser(profile);
                   const data = await calculateFarcasterStats(profile);
                   setCalculatedData(data);
                }
            } else {
                // FALLBACK: Load a demo user so stats are visible for testing/preview
                console.log("No Frame Context: Loading Demo User (dwr.eth)");
                const demoFid = 3; // dwr.eth
                const profile = await fetchFarcasterUser(demoFid);
                if (profile) {
                   setFarcasterUser(profile);
                   const data = await calculateFarcasterStats(profile);
                   setCalculatedData(data);
                }
            }
        } catch (error) {
            console.warn("SDK failed or not in frame:", error);
             // Fallback on error too
             const demoFid = 3; 
             const profile = await fetchFarcasterUser(demoFid);
             if (profile) {
                setFarcasterUser(profile);
                const data = await calculateFarcasterStats(profile);
                setCalculatedData(data);
             }
        }
    };
    init();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        handleImageSelected(file);
    }
    // RESET INPUT VALUE so if user cancels or wants to re-select same file, it triggers onChange
    if (e.target) e.target.value = "";
  };

  const handleImageSelected = (fileOrBase64: File | string) => {
    setStandData(null);
    setIsFlipped(false);
    
    // Clean up previous blob URL to avoid leaks
    if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
    }

    if (typeof fileOrBase64 === 'string') {
        setBase64Image(fileOrBase64);
        setPreview(fileOrBase64);
    } else {
        const objectUrl = URL.createObjectURL(fileOrBase64);
        setPreview(objectUrl);
        const reader = new FileReader();
        reader.onloadend = () => setBase64Image(reader.result as string);
        reader.readAsDataURL(fileOrBase64);
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!base64Image || isLoading) return;
    setIsLoading(true);
    setStandData(null); // Clear previous result to show LoadingScreen

    try {
      const result = await analyzeUserAndGenerateStand(
          base64Image, 
          calculatedData || undefined, 
          farcasterUser?.bio || undefined
      );
      setStandData(result);
    } catch (error) {
      console.error("Generation error:", error);
      alert("Stand Awakening Failed: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, base64Image, calculatedData, farcasterUser]);

  const onReset = () => {
    setStandData(null);
    setPreview(null);
    setBase64Image(null);
    setIsFlipped(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ==========================
  // VIEW: PRINTER (Must be checked FIRST)
  // ==========================
  if (showInteraction) {
      return <PrinterView 
          onBack={() => setShowInteraction(false)} 
          user={farcasterUser}
          stats={calculatedData?.stats || null}
          statDetails={calculatedData?.details}
          standName={standData?.standName}
          standImageUrl={standData?.standImageUrl}
          sketchImageUrl={standData?.sketchImageUrl}
      />;
  }
  
  // ==========================
  // VIEW: RESULT SCREEN (Flip Card)
  // ==========================
  if (standData) {
      return (
        <main className="h-dvh w-screen bg-black bg-noise pattern-grid flex flex-col items-center justify-center p-0 perspective-1000 overflow-hidden"
              style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            
            {/* Card Container with 3D flip - Full Screen Mode */}
            <div 
                onClick={() => setIsFlipped(!isFlipped)}
                className={`w-full h-full relative transition-transform duration-700 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
            >
                {/* FRONT SIDE: Art + Name Only */}
                <div className="absolute inset-0 w-full h-full backface-hidden bg-black border-x-[4px] border-black shadow-2xl overflow-hidden flex flex-col">
                     <div className="relative w-full h-full bg-gray-900 group">
                        {standData.standImageUrl ? (
                            <img src={standData.standImageUrl} className="w-full h-full object-cover" alt="Stand" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white">Image Gen Failed</div>
                        )}
                        
                        {/* Name Overlay (Fixed at top) */}
                        <div className="absolute top-12 left-0 w-full p-6 z-20">
                             <div className="bg-[#db2777] text-white text-xs font-bold px-3 py-1 inline-block transform -skew-x-12 mb-2 shadow-md">
                                STAND NAME
                             </div>
                             {/* REDUCED FONT SIZE HERE as requested */}
                             <h1 className="text-4xl md:text-5xl font-black italic font-jojo text-white drop-shadow-[4px_4px_0_#000] leading-[0.85] tracking-tighter text-outline-thick transform -rotate-2 origin-top-left break-words">
                                {standData.standName.replace(/[『』]/g, '')}
                             </h1>
                        </div>
                        
                        {/* Floating hint */}
                        <div className="absolute bottom-12 w-full text-center animate-bounce z-20 pointer-events-none">
                             <span className="bg-black/60 text-white text-xs px-4 py-2 rounded-full border border-white/20 backdrop-blur-sm font-bold flex items-center justify-center gap-2 w-max mx-auto">
                                <RotateCcw size={12} /> Tap to Flip
                             </span>
                        </div>
    
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none"></div>
                    </div>
                </div>
    
                {/* BACK SIDE: Detailed Stats (Manga Page Style) */}
                <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-white border-x-[4px] border-black shadow-2xl overflow-hidden flex flex-col">
                    
                    {/* Header Strip */}
                    <div className="h-16 bg-black flex items-center justify-between px-6 border-b-4 border-[#db2777] shrink-0">
                        <div className="flex items-center gap-2">
                             <Crosshair className="w-5 h-5 text-[#eab308] animate-[spin_4s_linear_infinite]" />
                             <span className="text-[#eab308] text-sm tracking-[0.3em] font-bold">STAND PARAMETERS</span>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-3 h-3 rounded-full bg-[#db2777]"></div>
                            <div className="w-3 h-3 rounded-full bg-[#06b6d4]"></div>
                        </div>
                    </div>
    
                    <div className="flex-1 overflow-y-auto no-scrollbar bg-[url('https://www.transparenttextures.com/patterns/white-diamond.png')] pb-20">
                        {/* 1. Name Strip */}
                        <div className="p-6 pb-2">
                            <div className="border-l-8 border-[#db2777] pl-4">
                                <h2 className="text-4xl font-black text-gray-900 leading-none tracking-tight">{standData.standName.replace(/[『』]/g, '')}</h2>
                            </div>
                        </div>
    
                        {/* 2. Stats Visuals */}
                        <div className="px-2 pt-4 pb-6 flex flex-col items-center gap-6 bg-gradient-to-b from-gray-100 to-white border-y border-gray-200">
                             {/* Radar - Moved up significantly */}
                             <div className="transform scale-100 pt-0 pb-0 -mt-14">
                                 <RadarChart stats={standData.stats} />
                             </div>
    
                             {/* Explanation Text */}
                             <div className="text-center -mt-10 mb-2 px-4 relative z-10">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-1 inline-block">
                                    Stats Generated from On-Chain Data & Social Quality
                                </p>
                             </div>
    
                             {/* Grid */}
                             <div className="grid grid-cols-3 gap-x-4 gap-y-8 p-4 w-full mt-16">
                                 <StatCircle label="破壊力" subLabel="POWER" value={standData.stats.power} detail={standData.statDetails?.power} />
                                 <StatCircle label="スピード" subLabel="SPEED" value={standData.stats.speed} detail={standData.statDetails?.speed} />
                                 <StatCircle label="持続力" subLabel="DURABILITY" value={standData.stats.durability} detail={standData.statDetails?.durability} />
                                 <StatCircle label="精密動作" subLabel="PRECISION" value={standData.stats.precision} detail={standData.statDetails?.precision} />
                                 <StatCircle label="射程距離" subLabel="RANGE" value={standData.stats.range} detail={standData.statDetails?.range} />
                                 <StatCircle label="成長性" subLabel="POTENTIAL" value={standData.stats.potential} detail={standData.statDetails?.potential} />
                             </div>
                        </div>
    
                        {/* 3. Ability Section */}
                        <div className="p-6 space-y-8">
                            <div className="flex items-center gap-2 mb-1">
                                 <Zap className="w-6 h-6 text-[#eab308] fill-current" />
                                 <span className="text-gray-400 text-sm font-bold">ABILITY</span>
                            </div>
                            
                            {/* Ability Box 1 */}
                            <div className="relative border-[3px] border-black bg-white shadow-[6px_6px_0_rgba(0,0,0,0.1)]">
                                 <div className="absolute -top-3 left-3 bg-[#eab308] border-2 border-black px-3 py-0.5 transform -rotate-2">
                                     <span className="text-xs font-black text-black">MAIN ABILITY</span>
                                 </div>
                                 <div className="p-6 pt-8">
                                     <h3 className="font-bold text-2xl text-[#db2777] mb-2 leading-tight">{standData.ability.split('：')[0] || 'Unknown Ability'}</h3>
                                     <p className="text-base text-gray-800 font-medium leading-relaxed">
                                         {standData.ability}
                                     </p>
                                 </div>
                            </div>
    
                            {/* Manifestation Box */}
                            <div className="relative border-[3px] border-black bg-white shadow-[6px_6px_0_rgba(0,0,0,0.1)]">
                                 <div className="absolute -top-3 left-3 bg-[#06b6d4] border-2 border-black px-3 py-0.5 transform rotate-1">
                                     <span className="text-xs font-black text-white">MANIFESTATION</span>
                                 </div>
                                 <div className="p-6 pt-8">
                                     <p className="text-base text-gray-800 font-medium leading-relaxed">
                                         {standData.standDescription}
                                     </p>
                                 </div>
                            </div>
                        </div>
                    </div>
    
                    {/* Footer: Battle Cry - UPDATED WITH ARROW */}
                    <div className="bg-black pt-6 pb-12 shrink-0 border-t-4 border-[#db2777] relative overflow-hidden group flex flex-col items-center justify-center">
                        <div className="text-white text-[10px] tracking-[0.4em] uppercase text-center mb-1 font-bold">BATTLE CRY</div>
                        <p className="text-white font-black italic text-center text-3xl md:text-5xl leading-none relative z-10 font-jojo drop-shadow-[0_2px_0_rgba(0,0,0,1)] filter drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] px-4">
                            "{standData.battleCry}"
                        </p>
                    </div>
                </div>
    
                {/* Floating Action Buttons (Fixed on Screen, independent of Flip) */}
                <div className="absolute top-4 right-4 z-50 flex flex-col gap-3">
                     {/* 1. Close Button */}
                     <button 
                        onClick={(e) => { e.stopPropagation(); onReset(); }}
                        className="w-12 h-12 bg-black text-white flex items-center justify-center rounded-full shadow-lg active:scale-95 transition-transform border-2 border-white/20 hover:bg-red-900/50"
                        title="Close"
                     >
                        <X size={24} />
                     </button>
                     {/* 2. Printer Button */}
                     <button 
                        onClick={(e) => { e.stopPropagation(); setShowInteraction(true); }}
                        className="w-12 h-12 bg-black text-[#fbbf24] flex items-center justify-center rounded-full shadow-lg active:scale-95 transition-transform border-2 border-[#fbbf24]/50 hover:bg-[#fbbf24] hover:text-black"
                        title="Print Stand Data"
                     >
                        <span className="text-xl">🖨️</span>
                     </button>
                </div>
                
            </div>
        </main>
      );
  }

  // ==========================
  // VIEW: UPLOAD SCREEN (RITUAL MODE)
  // ==========================
  return (
    // Use h-dvh (dynamic viewport height) for mobile browsers
    // REMOVED paddingBottom here to allow background to flow to bottom
    <main className="h-dvh w-screen bg-black bg-noise pattern-flowing-checkers flex flex-col relative overflow-hidden" 
          style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
            
            {/* Background Layers */}
            <FarcasterGateBackground />
            <MenacingFloaters />



            {/* Full Screen Main Container */}
            <div className="flex-1 flex flex-col items-center justify-between w-full h-full relative z-20">
            
            {isLoading && <LoadingScreen />}

            {/* HEADER AREA */}
            <div className="mt-12 md:mt-16 text-center z-20 relative w-full px-4">
                <div className="inline-block bg-[#fbbf24] px-4 py-0.5 transform -skew-x-12 mb-4 shadow-[0_0_10px_#fbbf24]">
                    <span className="text-black font-black text-xs tracking-widest transform skew-x-12 inline-block">THE ARROW AWAITS</span>
                </div>
                <h1 className="text-6xl md:text-7xl font-jojo text-white drop-shadow-[4px_4px_0_#db2777] tracking-tight leading-[0.9]">
                    AWAKEN<br/><span className="text-[#fbbf24] text-outline-thick">STAND</span>
                </h1>
                
                {farcasterUser ? (
                    <div className="mt-6 flex items-center justify-center gap-2">
                            <div className="w-2 h-2 bg-[#06b6d4] rotate-45 animate-pulse"></div>
                            <p className="text-xs tracking-[0.2em] text-[#06b6d4] uppercase font-bold border-b border-[#06b6d4]">
                            SOUL: @{farcasterUser.username}
                            </p>
                            <div className="w-2 h-2 bg-[#06b6d4] rotate-45 animate-pulse"></div>
                    </div>
                ) : (
                    <div className="mt-6 opacity-50">
                            <p className="text-xs tracking-[0.2em] text-gray-400 uppercase font-bold">Connecting Soul...</p>
                    </div>
                )}
            </div>

            {/* MIDDLE: Ritual Circle / Upload Button */}
            <div className="flex-1 flex items-center justify-center w-full z-20 py-8">
                <div className="relative w-72 h-72 md:w-80 md:h-80 flex items-center justify-center">
                        {/* Spinning Rings */}
                        <div className="absolute inset-0 border-2 border-dashed border-[#db2777] rounded-full animate-[spin_30s_linear_infinite] opacity-50"></div>
                        <div className="absolute inset-4 border border-dotted border-[#fbbf24] rounded-full animate-[spin_20s_linear_infinite_reverse] opacity-50"></div>
                        
                        {/* Main Button */}
                        <button 
                        onClick={() => preview ? handleGenerate() : fileInputRef.current?.click()}
                        disabled={isLoading}
                        className="relative w-48 h-48 md:w-56 md:h-56 group outline-none active:scale-95 transition-transform"
                        >
                        {/* 1. Diamond Background */}
                        <div className={`absolute inset-0 bg-gradient-to-br from-[#fbbf24] to-[#b45309] shadow-[0_0_30px_rgba(251,191,36,0.4)] transition-all duration-300 transform rotate-45 ${preview ? 'border-4 border-white' : 'group-hover:scale-105 group-hover:rotate-90 border-4 border-black'}`}></div>
                        
                        {/* 2. Image Preview Overlay */}
                        {preview && !isLoading && (
                            <div className="absolute inset-0 overflow-hidden transform rotate-45 border-4 border-black z-0">
                                <img src={preview} className="w-full h-full object-cover transform -rotate-45 scale-150 opacity-60 group-hover:opacity-100 transition-opacity" alt="Preview" />
                            </div>
                        )}

                        {/* 3. Inner Content */}
                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                            {preview ? (
                                <div className="text-center transform transition-transform group-hover:scale-110 drop-shadow-md">
                                    <Sparkles className="w-16 h-16 text-white fill-white/50 animate-pulse filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" />
                                    <span className="block text-white font-black text-sm mt-2 text-shadow-black">AWAKEN</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <Plus className="w-16 h-16 text-black" strokeWidth={4} />
                                </div>
                            )}
                        </div>
                        </button>
                </div>
            </div>

            {/* FOOTER AREA */}
            <div className="w-full flex flex-col items-center z-20">
                <div className="mb-4 h-12 flex items-center justify-center">
                    {preview ? (
                        <button onClick={() => { setPreview(null); setBase64Image(null); }} className="text-[#db2777] text-sm font-bold active:text-white uppercase tracking-widest border-b border-[#db2777] py-2 px-4">
                            Release Soul / Retake
                        </button>
                    ) : (
                        <span className="text-[#fbbf24] text-xs tracking-widest animate-pulse font-bold">TOUCH THE ARROW TO BEGIN</span>
                    )}
                </div>

                {/* Bottom Decorative Strip */}
                <div className="w-full border-y-2 border-[#fbbf24] bg-black shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                    <div className="h-16 flex items-center justify-between px-0 overflow-hidden relative">
                        {/* Left Decor */}
                        <div className="flex gap-1 shrink-0 z-10 bg-black h-full items-center px-2 border-r border-[#fbbf24]/30">
                            <Triangle className="w-4 h-4 text-[#db2777] fill-current rotate-90" />
                        </div>
                        
                        {/* Scrolling Text - UPDATED FONT HERE */}
                        <div className="flex-1 overflow-hidden relative h-full flex items-center">
                            <div className="animate-marquee-infinite flex gap-8 items-center">
                                <span className="text-2xl font-black italic font-jojo tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-[#fbbf24] via-[#fcd34d] to-[#b45309] drop-shadow-[0_2px_0_rgba(0,0,0,1)] whitespace-nowrap">
                                    YOUR ON-CHAIN STAND VISUALIZER
                                </span>
                                <span className="text-2xl font-black italic font-jojo tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-[#fbbf24] via-[#fcd34d] to-[#b45309] drop-shadow-[0_2px_0_rgba(0,0,0,1)] whitespace-nowrap">
                                    YOUR ON-CHAIN STAND VISUALIZER
                                </span>
                                <span className="text-2xl font-black italic font-jojo tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-[#fbbf24] via-[#fcd34d] to-[#b45309] drop-shadow-[0_2px_0_rgba(0,0,0,1)] whitespace-nowrap">
                                    YOUR ON-CHAIN STAND VISUALIZER
                                </span>
                            </div>
                        </div>

                        {/* Right Decor */}
                        <div className="flex gap-1 shrink-0 z-10 bg-black h-full items-center px-2 border-l border-[#fbbf24]/30">
                            <Triangle className="w-4 h-4 text-[#db2777] fill-current -rotate-90" />
                        </div>
                    </div>
                </div>
            </div>
            </div>
    </main>
  );
}
