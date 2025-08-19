'use client';

import { useRef, useEffect, forwardRef, useImperativeHandle, useState, type Ref } from 'react';

export type DrawingCanvasRef = {
  clear: () => void;
  toDataURL: () => string | undefined;
};

const DrawingCanvas = forwardRef((props, ref: Ref<DrawingCanvasRef>) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    // We need to keep the drawing style in a ref so we can re-apply it on resize
    const drawingStyle = {
      lineCap: 'round' as CanvasLineCap,
      strokeStyle: '#0f172a', // dark slate color
      lineWidth: 5,
    };

    const resizeCanvas = () => {
      const { width } = parent.getBoundingClientRect();
      canvas.width = width;
      canvas.height = width * 0.75; // 4:3 aspect ratio
      
      const context = canvas.getContext('2d');
      if (context) {
        context.lineCap = drawingStyle.lineCap;
        context.strokeStyle = drawingStyle.strokeStyle;
        context.lineWidth = drawingStyle.lineWidth;
        contextRef.current = context;
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const getEventPosition = (event: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };
    const rect = canvas.getBoundingClientRect();
    if (event instanceof MouseEvent) {
      return { offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
    } else if (event.touches && event.touches.length > 0) {
      return { offsetX: event.touches[0].clientX - rect.left, offsetY: event.touches[0].clientY - rect.top };
    }
    return { offsetX: 0, offsetY: 0 };
  }

  const startDrawing = (event: MouseEvent | TouchEvent) => {
    if (!(event instanceof MouseEvent)) {
        event.preventDefault();
    }
    const { offsetX, offsetY } = getEventPosition(event);
    contextRef.current?.beginPath();
    contextRef.current?.moveTo(offsetX, offsetY);
    setIsDrawing(true);
    setHasDrawing(true);
  };

  const finishDrawing = (event: MouseEvent | TouchEvent) => {
    if (!(event instanceof MouseEvent)) {
      event.preventDefault();
    }
    contextRef.current?.closePath();
    setIsDrawing(false);
  };

  const draw = (event: MouseEvent | TouchEvent) => {
    if (!isDrawing) return;
    if (!(event instanceof MouseEvent)) {
      event.preventDefault();
    }
    const { offsetX, offsetY } = getEventPosition(event);
    contextRef.current?.lineTo(offsetX, offsetY);
    contextRef.current?.stroke();
  };

  useImperativeHandle(ref, () => ({
    clear() {
      const canvas = canvasRef.current;
      const context = contextRef.current;
      if (canvas && context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawing(false);
      }
    },
    toDataURL() {
      return hasDrawing ? canvasRef.current?.toDataURL('image/png') : undefined;
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseUp={finishDrawing}
      onMouseMove={draw}
      onTouchStart={startDrawing}
      onTouchEnd={finishDrawing}
      onTouchMove={draw}
      className="w-full h-auto aspect-[4/3] bg-white rounded-md border-2 border-dashed cursor-crosshair touch-none"
    />
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';

export default DrawingCanvas;
