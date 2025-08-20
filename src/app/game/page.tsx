'use client';

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Loader2, Trophy, ArrowLeft, ArrowRight, ShieldAlert, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';

// Game Constants
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 100;
const PLAYER_SPEED = 7;

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
  const playerRef = useRef({ x: 100, y: 0, width: PLAYER_WIDTH, height: PLAYER_HEIGHT, health: 100, isSlashing: false, slashProgress: 0 });
  const keysRef = useRef({ ArrowLeft: false, ArrowRight: false, ' ': false });
  
  // Bullets State
  const bulletsRef = useRef<{ x: number; y: number; width: number, height: number }[]>([]);

  // Meteors State
  const meteorsRef = useRef<{ x: number; y: number; width: number, height: number }[]>([]);
  const meteorSpawnTimerRef = useRef(0);

  const drawPlayer = (ctx: CanvasRenderingContext2D, player: any) => {
    const headSize = 30;
    const bodyWidth = 40;
    const bodyHeight = 50;
    const armWidth = 15;
    const armHeight = 40;
    const legWidth = 18;
    const legHeight = 30;

    // Colors
    const skinColor = '#E0C09A';
    const armorColor = '#808080';
    const pantsColor = '#4b3d2a';
    
    const playerX = player.x - bodyWidth / 2;
    const playerY = player.y - bodyHeight / 2 - headSize / 2;

    // Legs
    ctx.fillStyle = pantsColor;
    ctx.fillRect(playerX, playerY + bodyHeight, legWidth, legHeight); // Left Leg
    ctx.fillRect(playerX + bodyWidth - legWidth, playerY + bodyHeight, legWidth, legHeight); // Right Leg

    // Body (Armor)
    ctx.fillStyle = armorColor;
    ctx.fillRect(playerX, playerY, bodyWidth, bodyHeight);

    // Head
    ctx.fillStyle = skinColor;
    ctx.fillRect(playerX + (bodyWidth - headSize) / 2, playerY - headSize, headSize, headSize);
    
    // Arms
    ctx.fillStyle = skinColor;
    const leftArmX = playerX - armWidth;
    const rightArmX = playerX + bodyWidth;
    const armY = playerY + 5;
    
    ctx.fillRect(leftArmX, armY, armWidth, armHeight); // Left Arm
    ctx.fillRect(rightArmX, armY, armWidth, armHeight); // Right Arm

    // Draw Weapon
    const weaponArmX = rightArmX; 
    const weaponArmY = armY + armHeight / 2;
    ctx.fillStyle = '#666';
    ctx.strokeStyle = '#333';
    
    switch (weaponType) {
        case 'sword':
             if (player.isSlashing) {
                ctx.save();
                ctx.strokeStyle = 'blue';
                ctx.lineWidth = 5;
                const slashCenterX = player.x + 30;
                const slashCenterY = player.y - player.height / 2;
                const startAngle = -Math.PI * 0.7;
                const endAngle = startAngle + (Math.PI * 0.9 * player.slashProgress);
                ctx.beginPath();
                ctx.arc(slashCenterX, slashCenterY, 60, startAngle, endAngle);
                ctx.stroke();
                ctx.restore();
            } else {
                ctx.save();
                ctx.translate(weaponArmX, weaponArmY);
                ctx.fillRect(0, -40, 5, 40); // blade
                ctx.fillRect(-5, 0, 15, 5); // hilt
                ctx.restore();
            }
            break;
        case 'gun':
            ctx.fillRect(weaponArmX, weaponArmY - 5, 30, 10);
            break;
        case 'shield':
             ctx.fillStyle = '#c0c0c0' // silver
             ctx.strokeStyle = '#808080'
             ctx.lineWidth = 3;
             const shieldX = leftArmX - 10;
             const shieldY = armY;
             ctx.beginPath();
             ctx.rect(shieldX - 20, shieldY - 25, 40, 50);
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
    ctx.fillText(`${Math.max(0, Math.round(playerRef.current.health))}/100`, 80, 25);
    
    // Score
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, ctx.canvas.width - 150, 30);
  };
  
  const handleAttack = useCallback(() => {
    const player = playerRef.current;
    switch (weaponType) {
        case 'gun':
            const weaponArmX = player.x + 20;
            const weaponArmY = player.y - player.height / 2 + 30;
            bulletsRef.current.push({
                x: weaponArmX + 30, // fire from the tip of the gun
                y: weaponArmY - 5,
                width: BULLET_WIDTH,
                height: BULLET_HEIGHT
            });
            break;
        case 'sword':
            if (!player.isSlashing) {
                player.isSlashing = true;
                player.slashProgress = 0;
            }
            break;
        case 'shield':
            // Shield is passive, no action on attack button
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

    // Update sword slash
    if (player.isSlashing) {
        player.slashProgress += 0.1; // Animation speed
        if (player.slashProgress >= 1) {
            player.isSlashing = false;
            player.slashProgress = 0;
        }
    }

    // Spawn Meteors
    meteorSpawnTimerRef.current++;
    if (meteorSpawnTimerRef.current > 60) { // Spawn every second
        const x = Math.random() * (canvas.width - METEOR_WIDTH);
        meteorsRef.current.push({ x, y: 0, width: METEOR_WIDTH, height: METEOR_HEIGHT });
        meteorSpawnTimerRef.current = 0;
    }

    // Update bullets
    bulletsRef.current = bulletsRef.current.filter(bullet => bullet.y > 0);
    bulletsRef.current.forEach(bullet => {
        bullet.y -= BULLET_SPEED;
    });

    // Update Meteors & check collisions
    for (let i = meteorsRef.current.length - 1; i >= 0; i--) {
        const meteor = meteorsRef.current[i];
        meteor.y += METEOR_SPEED;
        let meteorRemoved = false;
        
        // Meteor-player collision
        if (
            !gameOver &&
            player.x - player.width / 2 < meteor.x + meteor.width &&
            player.x + player.width / 2 > meteor.x &&
            player.y - player.height / 2 < meteor.y + meteor.height &&
            player.y + player.height / 2 > meteor.y
        ) {
            player.health -= 10;
            meteorsRef.current.splice(i, 1);
            meteorRemoved = true;
            if (player.health <= 0) {
                setGameOver(true);
            }
        }

        // Bullet-meteor collision
        if (!meteorRemoved) {
            for (let j = bulletsRef.current.length - 1; j >= 0; j--) {
                const bullet = bulletsRef.current[j];
                if (
                    bullet.x < meteor.x + meteor.width &&
                    bullet.x + bullet.width > meteor.x &&
                    bullet.y < meteor.y + meteor.height &&
                    bullet.y + bullet.height > meteor.y
                ) {
                    bulletsRef.current.splice(j, 1);
                    meteorsRef.current.splice(i, 1);
                    setScore((prev) => prev + 10);
                    meteorRemoved = true;
                    break;
                }
            }
        }

        // Sword-meteor collision
        if (!meteorRemoved && weaponType === 'sword' && player.isSlashing) {
            const slashCenterX = player.x + 30;
            const slashCenterY = player.y - player.height / 2;
            const distance = Math.sqrt(Math.pow(meteor.x - slashCenterX, 2) + Math.pow(meteor.y - slashCenterY, 2));
            if (distance > 30 && distance < 70) { // rough range of the slash
                meteorsRef.current.splice(i, 1);
                setScore(prev => prev + 10);
                meteorRemoved = true;
            }
        }

        // Shield-meteor collision
        if (!meteorRemoved && weaponType === 'shield') {
            const shieldHitbox = {
                x: player.x - player.width/2 - 35,
                y: player.y - player.height/2,
                width: 40,
                height: 50
            };
            if (
                meteor.x < shieldHitbox.x + shieldHitbox.width &&
                meteor.x + meteor.width > shieldHitbox.x &&
                meteor.y < shieldHitbox.y + shieldHitbox.height &&
                meteor.y + meteor.height > shieldHitbox.y
            ) {
                meteorsRef.current.splice(i, 1);
                setScore((prev) => prev + 5); // Lower score for just blocking
                meteorRemoved = true;
            }
        }

        // Remove meteor if it's off screen
        if (!meteorRemoved && meteor.y > canvas.height) {
            meteorsRef.current.splice(i, 1);
        }
    }


    // Draw everything
    drawPlayer(ctx, player);
    drawProjectiles(ctx, bulletsRef.current, 'yellow');
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
        playerRef.current.y = canvas.height - playerRef.current.height / 2 - 20;
        playerRef.current.x = canvas.width / 2;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
      }
       if(e.code === 'Space') {
          keysRef.current[' '] = true;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          keysRef.current[e.key] = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
          keysRef.current[' '] = false;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          keysRef.current[e.key] = false;
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
    <Card className="w-full max-w-lg text-center shadow-lg bg-card text-card-foreground">
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
                className="w-full p-2 border rounded text-black"
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
             <Button onMouseDown={() => (keysRef.current[' '] = true)} onMouseUp={() => (keysRef.current[' '] = false)} className="p-4">
                 {weaponType === 'shield' ? <ShieldAlert /> : <Zap />}
                 {weaponType === 'gun' ? 'Fire' : weaponType === 'sword' ? 'Swing' : 'Block'}
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