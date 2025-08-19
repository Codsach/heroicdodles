'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import DrawingCanvas, { type DrawingCanvasRef } from '@/components/drawing-canvas';
import { Eraser, Loader2, Sparkles, Trophy } from 'lucide-react';
import { classifyDrawingAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const canvasRef = useRef<DrawingCanvasRef>(null);
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleClear = () => {
    canvasRef.current?.clear();
  };

  const handleClassify = async () => {
    const dataUrl = canvasRef.current?.toDataURL();
    if (!dataUrl) {
      toast({
        title: 'Empty Canvas',
        description: 'Please draw your weapon before classifying.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const result = await classifyDrawingAction(dataUrl);
    setIsLoading(false);

    if (result.success && result.data) {
      router.push(`/result?weapon=${result.data.weaponType}`);
    } else {
      toast({
        title: 'Classification Error',
        description: result.error || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-2xl">
        <header className="text-center mb-8">
          <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-bold text-primary">Heroic Doodles</h1>
          <p className="text-muted-foreground mt-2 text-lg">Draw your weapon and let our AI bring it to life!</p>
        </header>
        <Card className="shadow-2xl shadow-primary/10">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Weapon Forge</CardTitle>
            <CardDescription>Unleash your creativity! Draw a sword, a gun, or a shield in the area below.</CardDescription>
          </CardHeader>
          <CardContent>
            <DrawingCanvas ref={canvasRef} />
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-4">
            <Button variant="outline" onClick={handleClear} className="w-full sm:w-auto" disabled={isLoading}>
              <Eraser className="mr-2 h-4 w-4" />
              Clear
            </Button>
            <Button onClick={handleClassify} className="w-full sm:w-auto flex-grow bg-accent hover:bg-accent/90" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Classify Weapon
            </Button>
          </CardFooter>
        </Card>
        <footer className="text-center mt-8 text-sm text-muted-foreground">
          <Button variant="ghost" onClick={() => router.push('/leaderboard')}>
            <Trophy className="mr-2 h-4 w-4" />
            View Leaderboard
          </Button>
          <p className="mt-2">Powered by Firebase and Genkit AI</p>
        </footer>
      </div>
    </main>
  );
}
