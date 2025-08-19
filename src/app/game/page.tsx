'use client';

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Loader2, Trophy, ArrowUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';

// Game Constants
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 100;
const PLAYER_SPEED = 5;
const JUMP_VELOCITY = 18;
const GRAVITY = 0.8;
const ENEMY_WIDTH = 40;
const ENEMY_HEIGHT = 40;
const ENEMY_SPEED = 2;

type WeaponType = 'sword' | 'gun' | 'shield';

function GameContent() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const weaponType = searchParams.get('weapon') as WeaponType | null;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  
  // Game State
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Player State
  const playerRef = useRef({ x: 100, y: 0, width: PLAYER_WIDTH, height: PLAYER_HEIGHT, vx: 0, vy: 0, health: 100, onGround: true });
  const keysRef = useRef({ ArrowLeft: false, ArrowRight: false, ' ': false });

  // Enemies State
  const enemiesRef = useRef<{ x: number; y: number; width: number, height: number }[]>([]);
  const enemySpawnTimerRef = useRef(0);

  const drawPlayer = (ctx: CanvasRenderingContext2D, player: any) => {
    // Body
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - player.height / 2); // neck
    ctx.lineTo(player.x, player.y + player.height / 3); // torso
    ctx.stroke();
    // Legs
    ctx.beginPath();
    ctx.moveTo(player.x, player.y + player.height / 3);
    ctx.lineTo(player.x - player.width / 4, player.y + player.height / 2);
    ctx.moveTo(player.x, player.y + player.height / 3);
    ctx.lineTo(player.x + player.width / 4, player.y + player.height / 2);
    ctx.stroke();
    // Arms & Weapon
    ctx.beginPath();
    const armY = player.y - player.height / 4;
    ctx.moveTo(player.x - player.width / 3, armY);
    ctx.lineTo(player.x, armY);
    ctx.lineTo(player.x + player.width / 3, armY);
    ctx.stroke();
    // Head
    ctx.beginPath();
    ctx.arc(player.x, player.y - player.height / 2 - 10, 10, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw Weapon
    const weaponX = player.x + player.width / 3;
    const weaponY = player.y - player.height / 4;
    ctx.fillStyle = '#666';
    ctx.strokeStyle = '#333';
    
    switch (weaponType) {
        case 'sword':
            ctx.fillRect(weaponX, weaponY - 40, 5, 40); // blade
            ctx.fillRect(weaponX - 5, weaponY, 15, 5); // hilt
            break;
        case 'gun':
            ctx.fillRect(weaponX, weaponY - 5, 30, 10);
            break;
        case 'shield':
            ctx.beginPath();
            ctx.arc(player.x - player.width/3, armY, 25, -Math.PI/2, Math.PI/2);
            ctx.fill();
            break;
    }
  };

  const drawEnemies = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = 'red';
    enemiesRef.current.forEach(enemy => {
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    });
  };

  const drawUI = (ctx: CanvasRenderingContext2D) => {
    // Health Bar
    ctx.fillStyle = 'red';
    ctx.fillRect(10, 10, 200, 20);
    ctx.fillStyle = 'green';
    ctx.fillRect(10, 10, playerRef.current.health * 2, 20);
    ctx.strokeStyle = 'black';
    ctx.strokeRect(10, 10, 200, 20);
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText(`${playerRef.current.health}/100`, 80, 25);
    
    // Score
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, ctx.canvas.width - 150, 30);
  };
  
  const handleJump = () => {
    const player = playerRef.current;
    if (player.onGround) {
        player.vy = -JUMP_VELOCITY;
        player.onGround = false;
    }
  };

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || gameOver) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const player = playerRef.current;
    
    // Player movement
    if (keysRef.current.ArrowLeft) player.x -= PLAYER_SPEED;
    if (keysRef.current.ArrowRight) player.x += PLAYER_SPEED;
    if (keysRef.current[' '] && player.onGround) {
        handleJump();
    }
    
    // Apply gravity
    player.vy += GRAVITY;
    player.y += player.vy;
    
    // Ground collision
    if (player.y + player.height / 2 > canvas.height - 20) {
        player.y = canvas.height - 20 - player.height / 2;
        player.vy = 0;
        player.onGround = true;
    }

    // Canvas bounds
    if (player.x - player.width/2 < 0) player.x = player.width/2;
    if (player.x + player.width/2 > canvas.width) player.x = canvas.width - player.width/2;

    // Spawn Enemies
    enemySpawnTimerRef.current++;
    if (enemySpawnTimerRef.current > 120) { // Spawn every 2 seconds
        const y = canvas.height - 20 - ENEMY_HEIGHT;
        const x = Math.random() < 0.5 ? 0 : canvas.width - ENEMY_WIDTH;
        enemiesRef.current.push({ x, y, width: ENEMY_WIDTH, height: ENEMY_HEIGHT });
        enemySpawnTimerRef.current = 0;
    }

    // Update and check enemies
    enemiesRef.current.forEach((enemy, index) => {
        // Move enemy
        if (enemy.x < player.x) enemy.x += ENEMY_SPEED;
        else enemy.x -= ENEMY_SPEED;

        // Player-Enemy collision
        if (
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y - player.height/2 < enemy.y + enemy.height &&
            player.y + player.height/2 > enemy.y
        ) {
            player.health -= 10;
            enemiesRef.current.splice(index, 1); // remove enemy on hit
            if (player.health <= 0) {
                player.health = 0;
                setGameOver(true);
            }
        }
    });

    // Update score
    if(!gameOver) {
        setScore(prev => prev + 1);
    }
    
    // Draw everything
    drawPlayer(ctx, player);
    drawEnemies(ctx);
    drawUI(ctx);
    
    if (!gameOver) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
  }, [gameOver, score, weaponType]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
        canvas.width = 1000;
        canvas.height = 500;
        playerRef.current.y = canvas.height - 20 - playerRef.current.height / 2;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key in keysRef.current) keysRef.current[e.key as keyof typeof keysRef.current] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key in keysRef.current) keysRef.current[e.key as keyof typeof keysRef.current] = false;
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameLoop]);

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

  const renderGameOver = () => (
    <Card className="w-full max-w-lg text-center shadow-lg">
        <CardHeader>
            <CardTitle className="text-4xl font-headline">Game Over</CardTitle>
            <CardDescription>You fought bravely! Your final score is {score}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
                Play Again
            </Button>
        </CardContent>
    </Card>
  );

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 bg-gray-900 text-white">
      {!gameOver ? (
        <>
          <canvas ref={canvasRef} className="bg-gray-200 rounded-md shadow-lg" />
          <div className="flex gap-4 mt-4">
            <Button onClick={handleJump} className="p-4">
              <ArrowUp className="mr-2 h-4 w-4" /> Jump
            </Button>
          </div>
        </>
      ) : (
        renderGameOver()
      )}
       <Button variant="ghost" className="mt-8 text-white hover:text-gray-300" onClick={() => router.push('/')}>
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
