'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, XCircle, CheckCircle, AlertCircle } from 'lucide-react';

interface ProgressBarProps {
  progress: number;
  status: string;
  file?: string;
  showDetails?: boolean;
  className?: string;
}

export function ProgressBar({
  progress,
  status,
  file,
  showDetails = true,
  className = '',
}: ProgressBarProps) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const progressRef = useRef(progress);
  const animationFrameRef = useRef<number>();

  // Smooth progress animation
  useEffect(() => {
    progressRef.current = progress;
    const animate = () => {
      setDisplayProgress((prev) => {
        const diff = progressRef.current - prev;
        if (Math.abs(diff) < 0.5) {
          return progressRef.current;
        }
        return prev + diff * 0.15;
      });
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [progress]);

  const getStatusIcon = () => {
    if (progress >= 100) return <CheckCircle className="w-5 h-5 text-green-400" />;
    if (status.toLowerCase().includes('erro') || status.toLowerCase().includes('error') || status.toLowerCase().includes('falha')) {
      return <AlertCircle className="w-5 h-5 text-red-400" />;
    }
    return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
  };

  const getStatusColor = () => {
    if (progress >= 100) return 'text-green-400';
    if (status.toLowerCase().includes('erro') || status.toLowerCase().includes('error') || status.toLowerCase().includes('falha')) {
      return 'text-red-400';
    }
    return 'text-primary';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">{getStatusIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm ${getStatusColor()}`}>{status}</p>
          {showDetails && file && (
            <p className="text-xs text-muted-foreground truncate">{file}</p>
          )}
        </div>
        <span className={`font-mono text-sm font-semibold ${getStatusColor()}`}>
          {Math.round(displayProgress)}%
        </span>
      </div>

      <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(Math.max(displayProgress, 0), 100)}%` }}
        />
        {displayProgress > 0 && displayProgress < 100 && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        )}
      </div>

      {showDetails && progress > 0 && progress < 100 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Baixando modelo...</span>
          <span>Isso acontece apenas na primeira vez</span>
        </div>
      )}
    </div>
  );
}

// Componente de progresso circular para estados compactos
interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function CircularProgress({ progress, size = 48, strokeWidth = 4, className = '' }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-secondary"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary transition-all duration-500 ease-out"
          style={{ strokeDashoffset: offset }}
        />
      </svg>
      <span className="absolute text-center font-mono text-xs font-bold text-foreground">
        {Math.round(progress)}%
      </span>
    </div>
  );
}

// Componente de stepper para múltiplas etapas
interface Step {
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

interface StepperProps {
  steps: Step[];
  className?: string;
}

export function Stepper({ steps, className = '' }: StepperProps) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {steps.map((step, index) => (
        <div key={index} className="flex flex-col items-center gap-2">
          <div className="relative flex items-center justify-center">
            <div
              className={`
                w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300
                ${
                  step.status === 'completed'
                    ? 'border-green-400 bg-green-400 text-white'
                    : step.status === 'active'
                    ? 'border-primary bg-primary text-white animate-pulse'
                    : step.status === 'error'
                    ? 'border-red-400 bg-red-400 text-white'
                    : 'border-border bg-transparent text-muted-foreground'
                }
              `}
            >
              {step.status === 'completed' && <CheckCircle className="w-5 h-5" />}
              {step.status === 'active' && <Loader2 className="w-5 h-5 animate-spin" />}
              {step.status === 'error' && <XCircle className="w-5 h-5" />}
              {step.status === 'pending' && (
                <span className="text-xs font-bold">{index + 1}</span>
              )}
            </div>
          </div>
          <span className={`
            text-xs font-medium text-center max-w-xs
            ${step.status === 'active' ? 'text-primary' : step.status === 'completed' ? 'text-green-400' : step.status === 'error' ? 'text-red-400' : 'text-muted-foreground'}
          `}>
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div
              className={`
                absolute top-4 left-full w-full h-0.5 -ml-4
                ${step.status === 'completed' ? 'bg-green-400' : 'bg-border'}
              `}
            />
          )}
        </div>
      ))}
    </div>
  );
}