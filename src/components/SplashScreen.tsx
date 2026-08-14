import { useEffect, useState } from 'react';
import { cn } from '../utils/cn';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState(0);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number; delay: number; duration: number }[]>([]);

  useEffect(() => {
    // Generate random particles
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      delay: Math.random() * 2,
      duration: Math.random() * 3 + 2,
    }));
    setParticles(newParticles);

    // Phase transitions
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 2800),
      setTimeout(() => onComplete(), 4200),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-emerald-950/20 to-zinc-950" />
      
      {/* Animated mesh gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={cn(
          "absolute -top-1/2 -left-1/2 h-[200%] w-[200%] rounded-full bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-cyan-500/10 blur-3xl transition-opacity duration-1000",
          phase >= 1 ? "opacity-100" : "opacity-0"
        )} />
        <div className={cn(
          "absolute -bottom-1/2 -right-1/2 h-[200%] w-[200%] rounded-full bg-gradient-to-r from-cyan-500/10 via-emerald-500/5 to-teal-500/10 blur-3xl transition-opacity duration-1000 delay-300",
          phase >= 2 ? "opacity-100" : "opacity-0"
        )} />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0">
        {particles.map((p) => (
          <div
            key={p.id}
            className={cn(
              "absolute rounded-full bg-emerald-400/30",
              phase >= 1 ? "animate-pulse" : "opacity-0"
            )}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Grid pattern overlay */}
      <div className={cn(
        "absolute inset-0 opacity-20 transition-opacity duration-1000",
        phase >= 1 ? "opacity-30" : "opacity-0"
      )}>
        <div 
          className="h-full w-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-6">
        {/* Logo animation */}
        <div className={cn(
          "relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 backdrop-blur-sm transition-all duration-700 sm:h-32 sm:w-32 sm:rounded-3xl",
          phase >= 1 ? "scale-100 opacity-100" : "scale-50 opacity-0",
          phase >= 3 && "animate-pulse"
        )}>
          {/* Animated border glow */}
          <div className={cn(
            "absolute inset-0 rounded-2xl transition-opacity duration-500 sm:rounded-3xl",
            phase >= 2 ? "opacity-100" : "opacity-0"
          )}>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 opacity-30 blur-md animate-spin-slow sm:rounded-3xl" />
          </div>
          
          {/* Llama icon */}
          <div className={cn(
            "text-4xl transition-all duration-500 sm:text-6xl",
            phase >= 2 ? "scale-110" : "scale-100"
          )}>
            🦙
          </div>

          {/* Orbiting dots */}
          {phase >= 2 && (
            <>
              <div className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-emerald-400 animate-ping sm:-top-2 sm:h-2 sm:w-2" />
              <div className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-cyan-400 animate-ping delay-100 sm:-bottom-2 sm:h-2 sm:w-2" />
              <div className="absolute top-1/2 -left-1 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-teal-400 animate-ping delay-200 sm:-left-2 sm:h-2 sm:w-2" />
              <div className="absolute top-1/2 -right-1 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-emerald-300 animate-ping delay-300 sm:-right-2 sm:h-2 sm:w-2" />
            </>
          )}
        </div>

        {/* Company name */}
        <div className={cn(
          "mt-6 text-center transition-all duration-700 sm:mt-8",
          phase >= 2 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        )}>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl sm:tracking-tight">
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              LASTIC
            </span>
            <span className="text-zinc-500"> </span>
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              PRODUCTIONS
            </span>
          </h1>
          
          {/* Tagline */}
          <p className={cn(
            "mt-2 text-xs font-medium text-zinc-500 transition-all duration-700 delay-200 sm:mt-3 sm:text-sm",
            phase >= 3 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          )}>
            Next-Gen AI Inference
          </p>

          {/* Animated underline */}
          <div className={cn(
            "mx-auto mt-3 h-0.5 w-0 rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 transition-all duration-700 sm:mt-4",
            phase >= 3 ? "w-24 sm:w-32" : "w-0"
          )} />
        </div>

        {/* Product name */}
        <div className={cn(
          "mt-4 flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 backdrop-blur-sm transition-all duration-700 delay-300 sm:mt-6 sm:px-4 sm:py-2",
          phase >= 4 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        )}>
          <span className="flex h-1.5 w-1.5 items-center justify-center sm:h-2 sm:w-2">
            <span className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400 opacity-75 sm:h-2 sm:w-2" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500 sm:h-2 sm:w-2" />
          </span>
          <span className="text-[10px] font-medium text-zinc-300 sm:text-xs">
            llama.cpp Web Studio
          </span>
        </div>

        {/* Loading bar */}
        <div className={cn(
          "mt-6 w-56 transition-all duration-700 delay-500 sm:mt-8 sm:w-64",
          phase >= 3 ? "opacity-100" : "opacity-0"
        )}>
          <div className="relative h-0.5 overflow-hidden rounded-full bg-zinc-800 sm:h-1">
            <div className={cn(
              "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 transition-all duration-[2000ms] ease-out",
              phase >= 4 ? "w-full" : "w-0"
            )} />
          </div>
          <div className="mt-1.5 flex justify-between text-[9px] text-zinc-600 sm:mt-2 sm:text-[10px]">
            <span className="hidden sm:inline">Initializing neural engine...</span>
            <span className="sm:hidden">Loading...</span>
            <span className={cn(phase >= 4 && "text-emerald-400")}>
              {phase >= 4 ? "Ready" : "Loading"}
            </span>
          </div>
        </div>

        {/* Skip button */}
        {phase >= 2 && (
          <button
            onClick={onComplete}
            className={cn(
              "mt-4 text-xs text-zinc-600 transition-colors hover:text-zinc-400 sm:mt-6",
              phase >= 4 && "opacity-0 pointer-events-none"
            )}
          >
            Skip intro
          </button>
        )}
      </div>

      {/* Corner decorations */}
      <div className={cn(
        "absolute bottom-4 right-4 text-[8px] font-mono text-zinc-700 transition-opacity duration-1000 sm:bottom-8 sm:right-8 sm:text-[10px]",
        phase >= 3 ? "opacity-100" : "opacity-0"
      )}>
        v3.0.0
      </div>

      <div className={cn(
        "absolute bottom-4 left-4 text-[8px] font-mono text-zinc-700 transition-opacity duration-1000 sm:bottom-8 sm:left-8 sm:text-[10px]",
        phase >= 3 ? "opacity-100" : "opacity-0"
      )}>
        LLAMA.CPP
      </div>
    </div>
  );
}
