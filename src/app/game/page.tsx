'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Loader2, Trophy, Sword, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import { Progress } from '@/components/ui/progress';

function GameContent() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const weaponType = searchParams.get('weapon');

  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState<'win' | 'loss' | null>(null);

  const [playerName, setPlayerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [playerHealth, setPlayerHealth] = useState(100);
  const [bossHealth, setBossHealth] = useState(100);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);

  const gameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handlePlayerAttack = () => {
    if (!isPlayerTurn || gameOver) return;

    const damage = Math.floor(Math.random() * 15) + 5; // Player deals 5-20 damage
    setBossHealth((prev) => Math.max(0, prev - damage));
    setScore((prev) => prev + damage * 10);
    setIsPlayerTurn(false);
  };

  // Boss attack logic
  useEffect(() => {
    if (!isPlayerTurn && !gameOver) {
      gameIntervalRef.current = setTimeout(() => {
        const damage = Math.floor(Math.random() * 10) + 5; // Boss deals 5-15 damage
        setPlayerHealth((prev) => Math.max(0, prev - damage));
        setIsPlayerTurn(true);
      }, 1000); // Boss attacks after 1 second
    }

    return () => {
      if (gameIntervalRef.current) {
        clearTimeout(gameIntervalRef.current);
      }
    };
  }, [isPlayerTurn, gameOver]);

  // Check for game over condition
  useEffect(() => {
    if (playerHealth <= 0) {
      setGameOver(true);
      setGameResult('loss');
      setScore((prev) => prev - 500); // Penalty for losing
      if (gameIntervalRef.current) clearTimeout(gameIntervalRef.current);
    } else if (bossHealth <= 0) {
      setGameOver(true);
      setGameResult('win');
      setScore((prev) => prev + 1000); // Bonus for winning
      if (gameIntervalRef.current) clearTimeout(gameIntervalRef.current);
    }
  }, [playerHealth, bossHealth]);


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

  const renderGameOver = () => {
    const title = gameResult === 'win' ? 'Victory!' : 'You have been defeated!';
    const description = gameResult === 'win'
      ? `You defeated the boss and scored ${score} points!`
      : `The boss was too strong. You scored ${score} points.`;
      
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold">{title}</h2>
        <p>{description}</p>
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
    );
  };
  
  const renderGame = () => (
      <div className="space-y-6">
        {/* Boss Area */}
        <div className="text-center">
            <p className="text-lg font-semibold">Boss</p>
            <div className="w-24 h-24 bg-red-600 rounded-full mx-auto my-2 flex items-center justify-center text-white text-4xl font-bold">B</div>
            <Progress value={bossHealth} className="w-full h-4" />
            <p className="text-sm text-muted-foreground">{bossHealth} / 100 HP</p>
        </div>

        {/* Player Area */}
        <div className="text-center">
             <div className="w-24 h-24 bg-blue-600 rounded-full mx-auto my-2 flex items-center justify-center text-white text-4xl font-bold">P</div>
            <p className="text-lg font-semibold">You</p>
            <Progress value={playerHealth} className="w-full h-4" />
            <p className="text-sm text-muted-foreground">{playerHealth} / 100 HP</p>
        </div>
        
        <Button onClick={handlePlayerAttack} className="w-full" disabled={!isPlayerTurn || gameOver}>
          <Sword className="mr-2 h-4 w-4" />
          Attack!
        </Button>
      </div>
  );

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 bg-gray-50">
       <div className="absolute top-4 right-4 text-lg font-bold text-primary">Score: {score}</div>
      <Card className="w-full max-w-lg text-center shadow-lg">
        <CardHeader>
          <CardTitle className="text-4xl font-headline">
            The Battle of Doodles
          </CardTitle>
          <CardDescription>
            You are wielding a mighty {weaponType}!
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[300px] flex items-center justify-center">
          {gameOver ? renderGameOver() : renderGame()}
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
  
