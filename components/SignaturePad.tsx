import React, { useRef, useEffect, useState, useCallback } from 'react';
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

  const initCanvas = useCallback((preserveContent = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const oldContent = (preserveContent && lastSignatureRef.current) ? lastSignatureRef.current : null;

    // Clear previous transformations
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const rect = canvas.getBoundingClientRect();
    if (isFullscreen) {
      // In fullscreen, the container is rotated 90deg.
      // The visual width (rect.width) is the screen width (e.g. 390)
      // The visual height (rect.height) is the screen height (e.g. 844)
      // We want the internal canvas to be landscape (844x390)
      canvas.width = rect.height;
      canvas.height = rect.width;
    } else {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (oldContent) {
      const img = new Image();
      img.src = oldContent;
      img.onload = () => {
        // When restoring, we might need to handle orientation changes, 
        // but for now we just draw it to fit.
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
    } else {
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 10]);
      const y = canvas.height * 0.65;
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(canvas.width - 20, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.strokeStyle = COLORS.MAROON;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [isFullscreen]);

  useEffect(() => {
    initCanvas();
    window.addEventListener('resize', initCanvas);
    return () => window.removeEventListener('resize', initCanvas);
  }, [initCanvas]);

  const getPointerPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    if (isFullscreen) {
      // The container is rotated 90deg clockwise.
      // Visual X (left-to-right on screen) is Canvas -Y.
      // Visual Y (top-to-bottom on screen) is Canvas X.
      
      // Normalize clientX/Y to the rect
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      
      // In a 90deg clockwise rotation:
      // NewX = y
      // NewY = rect.width - x
      
      // We also need to scale if the internal canvas size differs from the rect size
      // rect.width is visual width (e.g. 390), rect.height is visual height (e.g. 844)
      // canvas.width is 844, canvas.height is 390
      const scaleX = canvas.width / rect.height; 
      const scaleY = canvas.height / rect.width;
      
      return {
        x: y * scaleX,
        y: (rect.width - x) * scaleY
      };
    }

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
    lastSignatureRef.current = null;
    initCanvas(false);
    onClear();
  };

  const toggleFullscreen = () => {
    if (canvasRef.current) {
      lastSignatureRef.current = canvasRef.current.toDataURL('image/jpeg', 0.5);
    }
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div 
      ref={containerRef} 
      className={`space-y-2 flex flex-col touch-none ${isFullscreen ? 'fixed inset-0 z-[1000] bg-white p-6 flex flex-col' : 'relative w-full'}`}
      style={isFullscreen ? {
        top: '50%',
        left: '50%',
        width: '100vh',
        height: '100vw',
        transform: 'translate(-50%, -50%) rotate(90deg)',
      } : {}}
    >
      {/* Conditional rendering for landscape sidebar vs portrait header */}
      <div className={`flex ${isFullscreen ? 'landscape:flex-col landscape:w-48 landscape:justify-between' : 'justify-between items-center'} text-[10px] uppercase font-black tracking-widest text-gray-400 h-6`}>
        <span className="flex items-center gap-2">Signature Pad {isFullscreen && <span className="text-[#800000] animate-pulse">(Fullscreen)</span>}</span>
        <div className={`flex items-center gap-4 ${isFullscreen ? 'landscape:flex-col landscape:w-full' : ''}`}>
          <button onClick={clear} className={`text-red-600 flex items-center gap-1 hover:opacity-70 transition-opacity ${isFullscreen ? 'landscape:w-full landscape:bg-red-50 landscape:p-4 landscape:rounded-2xl landscape:justify-center' : ''}`}>
            <Trash2 size={12} /> Clear
          </button>
          <button onClick={toggleFullscreen} className={`flex items-center gap-1 hover:opacity-70 transition-opacity ${isFullscreen ? 'landscape:w-full landscape:p-4 landscape:rounded-2xl landscape:justify-center landscape:bg-[#800000] landscape:text-white' : 'text-[#800000]'}`}>
            {isFullscreen ? <><span className="landscape:hidden"><Minimize2 size={12} /> Exit</span><span className="hidden landscape:inline">Confirm</span></> : <><Maximize2 size={12} /> Fullscreen</>}
          </button>
        </div>
      </div>
      
      <div className={`border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden bg-gray-50/50 ${isFullscreen ? 'flex-1' : 'h-36'}`}>
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
          className="w-full py-4 bg-[#800000] text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all portrait:w-full landscape:hidden"
        >
          Confirm Signature
        </button>
      )}
    </div>
  );
};