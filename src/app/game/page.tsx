'use client';

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Loader2, Trophy, ArrowLeft, ArrowRight, ShieldAlert, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';

// Game Constants
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 100;
const PLAYER_SPEED = 7;
const SHIELD_DAMAGE_REDUCTION = 0.5;

const METEOR_WIDTH = 20;
const METEOR_HEIGHT = 20;
const METEOR_SPEED = 3;

const BULLET_WIDTH = 5;
const BULLET_HEIGHT = 15;
const BULLET_SPEED = 10;

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
  const playerRef = useRef({ x: 100, y: 0, width: PLAYER_WIDTH, height: PLAYER_HEIGHT, health: 100, isSwinging: false, swingAngle: 0 });
  const keysRef = useRef({ ArrowLeft: false, ArrowRight: false, ' ': false });
  
  // Bullets State
  const bulletsRef = useRef<{ x: number; y: number; width: number, height: number }[]>([]);

  // Meteors State
  const meteorsRef = useRef<{ x: number; y: number; width: number, height: number }[]>([]);
  const meteorSpawnTimerRef = useRef(0);

  const drawPlayer = (ctx: CanvasRenderingContext2D, player: any) => {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    // Body
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
    // Arms
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
    const weaponArmX = player.x + player.width / 3;
    const weaponArmY = player.y - player.height / 4;
    ctx.fillStyle = '#666';
    ctx.strokeStyle = '#333';
    
    switch (weaponType) {
        case 'sword':
            ctx.save();
            ctx.translate(weaponArmX, weaponArmY);
            if (player.isSwinging) {
              ctx.rotate(player.swingAngle);
            }
            ctx.fillRect(0, -40, 5, 40); // blade
            ctx.fillRect(-5, 0, 15, 5); // hilt
            ctx.restore();
            break;
        case 'gun':
            ctx.fillRect(weaponArmX, weaponArmY - 5, 30, 10);
            break;
        case 'shield':
             ctx.beginPath();
             const shieldX = player.x - player.width / 3;
             ctx.arc(shieldX, armY, 25, Math.PI * 1.5, Math.PI * 0.5);
             ctx.fill();
             ctx.stroke();
             break;
    }
  };

  const drawProjectiles = (ctx: CanvasRenderingContext2D, list: any[], color: string) => {
    ctx.fillStyle = color;
    list.forEach(item => {
      ctx.fillRect(item.x, item.y, item.width, item.height);
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
    ctx.fillText(`${Math.max(0, playerRef.current.health)}/100`, 80, 25);
    
    // Score
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, ctx.canvas.width - 150, 30);
  };
  
  const handleAttack = useCallback(() => {
    const player = playerRef.current;
    switch (weaponType) {
        case 'gun':
            bulletsRef.current.push({
                x: player.x + player.width / 3,
                y: player.y - player.height / 4,
                width: BULLET_WIDTH,
                height: BULLET_HEIGHT
            });
            break;
        case 'sword':
            if (!player.isSwinging) {
                player.isSwinging = true;
                player.swingAngle = -Math.PI / 2;
            }
            break;
        case 'shield':
            // Shield is passive
            break;
    }
  }, [weaponType]);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || gameOver) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const player = playerRef.current;
    
    // Player movement
    if (keysRef.current.ArrowLeft) player.x -= PLAYER_SPEED;
    if (keysRef.current.ArrowRight) player.x += PLAYER_SPEED;

    // Player attack
    if (keysRef.current[' ']) {
        handleAttack();
        keysRef.current[' '] = false; // Prevent continuous fire/swing
    }

    // Canvas bounds
    if (player.x - player.width/2 < 0) player.x = player.width/2;
    if (player.x + player.width/2 > canvas.width) player.x = canvas.width - player.width/2;

    // Update sword swing
    if (player.isSwinging) {
        player.swingAngle += Math.PI / 10;
        if (player.swingAngle >= Math.PI / 4) {
            player.isSwinging = false;
            player.swingAngle = 0;
        }
    }

    // Spawn Meteors
    meteorSpawnTimerRef.current++;
    if (meteorSpawnTimerRef.current > 60) { // Spawn every second
        const x = Math.random() * (canvas.width - METEOR_WIDTH);
        meteorsRef.current.push({ x, y: -METEOR_HEIGHT, width: METEOR_WIDTH, height: METEOR_HEIGHT });
        meteorSpawnTimerRef.current = 0;
    }

    // Update bullets
    bulletsRef.current.forEach((bullet, index) => {
        bullet.y -= BULLET_SPEED;
        if (bullet.y < 0) {
            bulletsRef.current.splice(index, 1);
        }
    });

    // Update Meteors & check collisions
    meteorsRef.current.forEach((meteor, meteorIndex) => {
        meteor.y += METEOR_SPEED;

        // Meteor-player collision
        const isColliding =
            player.x < meteor.x + meteor.width &&
            player.x + player.width > meteor.x &&
            player.y - player.height/2 < meteor.y + meteor.height &&
            player.y + player.height/2 > meteor.y;
        
        if (isColliding) {
            meteorsRef.current.splice(meteorIndex, 1);
            const damage = weaponType === 'shield' ? 10 * SHIELD_DAMAGE_REDUCTION : 10;
            player.health -= damage;
            if (player.health <= 0) {
                setGameOver(true);
            }
            return;
        }
        
        if (meteor.y > canvas.height) {
            meteorsRef.current.splice(meteorIndex, 1);
        }

        // Bullet-meteor collision
        bulletsRef.current.forEach((bullet, bulletIndex) => {
            if (
                bullet.x < meteor.x + meteor.width &&
                bullet.x + bullet.width > meteor.x &&
                bullet.y < meteor.y + meteor.height &&
                bullet.y + bullet.height > meteor.y
            ) {
                bulletsRef.current.splice(bulletIndex, 1);
                meteorsRef.current.splice(meteorIndex, 1);
                setScore(prev => prev + 10);
            }
        });
        
        // Sword-meteor collision
        if (weaponType === 'sword' && player.isSwinging) {
            const swordTipX = player.x + player.width/3 + 30 * Math.sin(player.swingAngle);
            const swordTipY = player.y - player.height/4 - 30 * Math.cos(player.swingAngle);
            if (
                swordTipX > meteor.x && swordTipX < meteor.x + meteor.width &&
                swordTipY > meteor.y && swordTipY < meteor.y + meteor.height
            ) {
                 meteorsRef.current.splice(meteorIndex, 1);
                 setScore(prev => prev + 10);
            }
        }
    });

    // Draw everything
    drawPlayer(ctx, player);
    drawProjectiles(ctx, bulletsRef.current, 'blue');
    drawProjectiles(ctx, meteorsRef.current, 'orange');
    drawUI(ctx);
    
    if (!gameOver) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
  }, [gameOver, score, weaponType, handleAttack]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
        canvas.width = 1000;
        canvas.height = 500;
        const groundY = canvas.height - 20;
        playerRef.current.y = groundY - playerRef.current.height / 2;
        playerRef.current.x = canvas.width / 2;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key in keysRef.current && !e.repeat) {
          keysRef.current[e.key as keyof typeof keysRef.current] = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key in keysRef.current) {
          keysRef.current[e.key as keyof typeof keysRef.current] = false;
      }
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
            <Button onMouseDown={() => keysRef.current.ArrowLeft = true} onMouseUp={() => keysRef.current.ArrowLeft = false} onMouseLeave={() => keysRef.current.ArrowLeft = false} className="p-4">
              <ArrowLeft /> Left
            </Button>
            <Button onClick={handleAttack} className="p-4">
                {weaponType === 'shield' ? <ShieldAlert /> : <Zap />}
                {weaponType === 'shield' ? 'Brace' : 'Fire'}
            </Button>
            <Button onMouseDown={() => keysRef.current.ArrowRight = true} onMouseUp={() => keysRef.current.ArrowRight = false} onMouseLeave={() => keysRef.current.ArrowRight = false} className="p-4">
              Right <ArrowRight />
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

    