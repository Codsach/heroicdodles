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

  // This effect sets up the canvas and its drawing context.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    contextRef.current = context;

    // Set initial drawing styles.
    const drawingStyle = {
      lineCap: 'round' as CanvasLineCap,
      strokeStyle: '#0f172a',
      lineWidth: 5,
    };
    
    Object.assign(context, drawingStyle);

    // This function resizes the canvas to fit its container.
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const { width } = parent.getBoundingClientRect();

      // Save the current drawing.
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCtx.drawImage(canvas, 0, 0);
      }

      // Resize the canvas.
      canvas.width = width;
      canvas.height = width * 0.75;
      
      // Re-apply styles and restore the drawing.
      if (contextRef.current) {
        Object.assign(contextRef.current, drawingStyle);
        if (tempCtx) {
          contextRef.current.drawImage(tempCanvas, 0, 0);
        }
      }
    };

    // Initial resize and setup listener for window resizing.
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // This effect handles the drawing events.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
        return { offsetX: 0, offsetY: 0 };
      }

      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return { 
        offsetX: (clientX - rect.left) * scaleX, 
        offsetY: (clientY - rect.top) * scaleY 
      };
    };

    const startDrawing = (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
      const { offsetX, offsetY } = getEventPosition(event);
      if (contextRef.current) {
        contextRef.current.beginPath();
        contextRef.current.moveTo(offsetX, offsetY);
        setIsDrawing(true);
        if (!hasDrawing) setHasDrawing(true);
      }
    };

    const finishDrawing = (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
      if (contextRef.current && isDrawing) {
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

    // Add event listeners.
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mouseup', finishDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseleave', finishDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchend', finishDrawing, { passive: false });
    canvas.addEventListener('touchcancel', finishDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });

    // Cleanup listeners.
    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mouseup', finishDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseleave', finishDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchend', finishDrawing);
      canvas.removeEventListener('touchcancel', finishDrawing);
      canvas.removeEventListener('touchmove', draw);
    };
  }, [isDrawing, hasDrawing]);

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
