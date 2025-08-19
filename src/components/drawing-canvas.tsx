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

    const context = canvas.getContext('2d');
    if (!context) return;
    contextRef.current = context;

    const drawingStyle = {
      lineCap: 'round' as CanvasLineCap,
      strokeStyle: '#0f172a', // Use a visible color by default
      lineWidth: 5,
    };

    const applyStyles = (ctx: CanvasRenderingContext2D) => {
      ctx.lineCap = drawingStyle.lineCap;
      ctx.strokeStyle = drawingStyle.strokeStyle;
      ctx.lineWidth = drawingStyle.lineWidth;
    };
    
    applyStyles(context);

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const { width } = parent.getBoundingClientRect();
      
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCtx.drawImage(canvas, 0, 0);
      }

      canvas.width = width;
      canvas.height = width * 0.75;
      
      if (contextRef.current) {
        applyStyles(contextRef.current);
        if(tempCtx) {
          contextRef.current.drawImage(tempCanvas, 0, 0);
        }
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const getEventPosition = (event: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      let clientX, clientY;

      if (event instanceof MouseEvent) {
        clientX = event.clientX;
        clientY = event.clientY;
      } else if (event.touches && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      } else {
        // Should not happen, but as a fallback
        return { offsetX: 0, offsetY: 0 };
      }

      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return { 
        offsetX: (clientX - rect.left) * scaleX, 
        offsetY: (clientY - rect.top) * scaleY 
      };
    }

    const startDrawing = (event: MouseEvent | TouchEvent) => {
      event.preventDefault(); // Prevent default touch actions like scrolling
      const { offsetX, offsetY } = getEventPosition(event);
      if (contextRef.current) {
        contextRef.current.beginPath();
        contextRef.current.moveTo(offsetX, offsetY);
        setIsDrawing(true);
        setHasDrawing(true);
      }
    };

    const finishDrawing = (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
      if (contextRef.current) {
        contextRef.current.closePath();
        setIsDrawing(false);
      }
    };

    const draw = (event: MouseEvent | TouchEvent) => {
      if (!isDrawing || !contextRef.current) return;
      event.preventDefault();
      const { offsetX, offsetY } = getEventPosition(event);
      contextRef.current.lineTo(offsetX, offsetY);
      contextRef.current.stroke();
    };

    // Add event listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mouseup', finishDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseleave', finishDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchend', finishDrawing);
    canvas.addEventListener('touchcancel', finishDrawing);
    canvas.addEventListener('touchmove', draw, { passive: false });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mouseup', finishDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseleave', finishDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchend', finishDrawing);
      canvas.removeEventListener('touchcancel', finishDrawing);
      canvas.removeEventListener('touchmove', draw);
    };
  }, [isDrawing]);

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
      if (!hasDrawing) {
        return undefined;
      }
      const canvas = canvasRef.current;
      if (!canvas) return undefined;
      
      const newCanvas = document.createElement('canvas');
      newCanvas.width = canvas.width;
      newCanvas.height = canvas.height;
      const newContext = newCanvas.getContext('2d');

      if (!newContext) return undefined;

      newContext.fillStyle = 'white';
      newContext.fillRect(0, 0, newCanvas.width, newCanvas.height);
      newContext.drawImage(canvas, 0, 0);

      return newCanvas.toDataURL('image/png');
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-auto aspect-[4/3] bg-white rounded-md border-2 border-dashed cursor-crosshair touch-none"
    />
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';

export default DrawingCanvas;
