import React, { useRef, useEffect, useState } from 'react';
import { COLORS } from '../constants';
import { Maximize2, Minimize2, Trash2 } from 'lucide-react';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onClear: () => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onClear }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastSignatureRef = useRef<string | null>(null);

  const initCanvas = (preserveContent = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let tempImage: HTMLImageElement | null = null;
    if (preserveContent && lastSignatureRef.current) {
      tempImage = new Image();
      tempImage.src = lastSignatureRef.current;
    }

    requestAnimationFrame(() => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      ctx.strokeStyle = COLORS.MAROON;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (tempImage) {
        tempImage.onload = () => {
          ctx.drawImage(tempImage!, 0, 0, canvas.width, canvas.height);
        };
      }
    });
  };

  useEffect(() => {
    initCanvas();
    window.addEventListener('resize', () => initCanvas());
    return () => window.removeEventListener('resize', () => initCanvas());
  }, [isFullscreen]);

  const getPointerPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getPointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getPointerPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      // JPEG doesn't support transparency. We must paint a white background
      // explicitly on an offscreen canvas before generating the DataURL.
      const offscreen = document.createElement('canvas');
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const octx = offscreen.getContext('2d');
      if (octx) {
        octx.fillStyle = '#ffffff';
        octx.fillRect(0, 0, offscreen.width, offscreen.height);
        octx.drawImage(canvas, 0, 0);
        
        const dataUrl = offscreen.toDataURL('image/jpeg', 0.5);
        lastSignatureRef.current = dataUrl;
        onSave(dataUrl);
      }
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lastSignatureRef.current = null;
    onClear();
  };

  const toggleFullscreen = () => {
    if (canvasRef.current) {
      lastSignatureRef.current = canvasRef.current.toDataURL('image/jpeg', 0.5);
    }
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div ref={containerRef} className={`space-y-2 flex flex-col ${isFullscreen ? 'fixed inset-0 z-[1000] bg-white p-6' : 'relative w-full'}`}>
      <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-gray-400 h-6">
        <span className="flex items-center gap-2">Signature Pad {isFullscreen && <span className="text-[#800000] animate-pulse">(Fullscreen)</span>}</span>
        <div className="flex items-center gap-4">
          <button onClick={clear} className="text-red-600 flex items-center gap-1 hover:opacity-70 transition-opacity">
            <Trash2 size={12} /> Clear
          </button>
          <button onClick={toggleFullscreen} className="text-[#800000] flex items-center gap-1 hover:opacity-70 transition-opacity">
            {isFullscreen ? <><Minimize2 size={12} /> Exit</> : <><Maximize2 size={12} /> Fullscreen</>}
          </button>
        </div>
      </div>
      
      <div className={`border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden bg-gray-50/50 ${isFullscreen ? 'flex-1 mt-4 mb-4' : 'h-36'}`}>
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair touch-none bg-white/50"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      
      {isFullscreen && (
        <button 
          onClick={toggleFullscreen}
          className="w-full py-4 bg-[#800000] text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all"
        >
          Confirm Signature
        </button>
      )}
    </div>
  );
};