'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Loader2, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';

function GameContent() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const weaponType = searchParams.get('weapon');

  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const gameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // simple game logic: score increases over time
    gameIntervalRef.current = setInterval(() => {
      if (!gameOver) {
        setScore((prevScore) => prevScore + 10);
      }
    }, 1000);

    // End game after 30 seconds
    setTimeout(() => {
      setGameOver(true);
      if (gameIntervalRef.current) {
        clearInterval(gameIntervalRef.current);
      }
    }, 30000);

    return () => {
      if (gameIntervalRef.current) {
        clearInterval(gameIntervalRef.current);
      }
    };
  }, [gameOver]);

  const handleSaveScore = async () => {
    if (!playerName.trim()) {
      toast({
        title: 'Player Name Required',
        description: 'Please enter your name to save your score.',
        variant: 'destructive',
      });
      return;
    }
    setIsSaving(true);
    try {
      const scoreId = uuidv4();
      await setDoc(doc(db, "scores", scoreId), {
        name: playerName,
        score: score,
        weapon: weaponType,
        createdAt: serverTimestamp(),
      });
      toast({
        title: 'Score Saved!',
        description: 'Your heroic achievement has been recorded.',
      });
      router.push('/leaderboard');
    } catch (error) {
      console.error("Error saving score: ", error);
      toast({
        title: 'Error Saving Score',
        description: 'Could not save your score. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 bg-gray-50">
       <div className="absolute top-4 right-4 text-lg font-bold text-primary">Score: {score}</div>
      <Card className="w-full max-w-lg text-center shadow-lg">
        <CardHeader>
          <CardTitle className="text-4xl font-headline">
            {gameOver ? 'Game Over!' : `Playing with ${weaponType}`}
          </CardTitle>
          <CardDescription>
            {gameOver ? `You scored ${score} points!` : 'Survive as long as you can!'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {gameOver ? (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full p-2 border rounded"
              />
              <Button onClick={handleSaveScore} className="w-full" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trophy className="mr-2 h-4 w-4" />}
                Save Score & View Leaderboard
              </Button>
            </div>
          ) : (
            <div className="aspect-video bg-white w-full rounded-md border-2 border-dashed flex items-center justify-center">
              <p className="text-muted-foreground">Your game would be here...</p>
            </div>
          )}
        </CardContent>
      </Card>
      <Button variant="outline" className="mt-8" onClick={() => router.push('/')}>
        <Home className="mr-2 h-4 w-4" />
        Return to Forge
      </Button>
    </main>
  );
}


export default function GamePage() {
    return (
      <Suspense fallback={<div className="flex min-h-screen w-full items-center justify-center">Loading game...</div>}>
        <GameContent />
      </Suspense>
    );
  }
  
