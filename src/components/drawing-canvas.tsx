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

  // Store style in a ref to avoid re-creating it on every render
  const drawingStyleRef = useRef({
    lineCap: 'round' as CanvasLineCap,
    strokeStyle: '#0f172a', // dark slate color
    lineWidth: 5,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const applyStyles = (context: CanvasRenderingContext2D) => {
      context.lineCap = drawingStyleRef.current.lineCap;
      context.strokeStyle = drawingStyleRef.current.strokeStyle;
      context.lineWidth = drawingStyleRef.current.lineWidth;
    };

    const resizeCanvas = () => {
      const { width } = parent.getBoundingClientRect();
      canvas.width = width;
      canvas.height = width * 0.75; // 4:3 aspect ratio
      
      const context = canvas.getContext('2d');
      if (context) {
        applyStyles(context); // Re-apply styles on resize
        contextRef.current = context;
      }
    };
    
    // Initial setup
    const context = canvas.getContext('2d');
    if (context) {
        contextRef.current = context;
        resizeCanvas();
    }
    
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
    event.preventDefault();
    const { offsetX, offsetY } = getEventPosition(event);
    if (!contextRef.current) return;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
    setHasDrawing(true);
  };

  const finishDrawing = (event: MouseEvent | TouchEvent) => {
    event.preventDefault();
    if (!contextRef.current) return;
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  const draw = (event: MouseEvent | TouchEvent) => {
    if (!isDrawing || !contextRef.current) return;
    event.preventDefault();
    const { offsetX, offsetY } = getEventPosition(event);
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
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
      // Return undefined if nothing has been drawn to avoid sending an empty image
      if (!hasDrawing) {
        return undefined;
      }

      const canvas = canvasRef.current;
      if (!canvas) return undefined;
      
      // Create a new canvas to draw a white background
      const newCanvas = document.createElement('canvas');
      newCanvas.width = canvas.width;
      newCanvas.height = canvas.height;
      const newContext = newCanvas.getContext('2d');

      if (!newContext) return undefined;

      // Fill background with white
      newContext.fillStyle = 'white';
      newContext.fillRect(0, 0, newCanvas.width, newCanvas.height);

      // Draw the original content on top
      newContext.drawImage(canvas, 0, 0);

      return newCanvas.toDataURL('image/png');
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseUp={finishDrawing}
      onMouseMove={draw}
      onMouseLeave={finishDrawing} // Stop drawing if mouse leaves canvas
      onTouchStart={startDrawing}
      onTouchEnd={finishDrawing}
      onTouchCancel={finishDrawing} // Stop drawing on touch cancel
      onTouchMove={draw}
      className="w-full h-auto aspect-[4/3] bg-white rounded-md border-2 border-dashed cursor-crosshair touch-none"
    />
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';

export default DrawingCanvas;
