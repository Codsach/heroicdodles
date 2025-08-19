'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Sword, Shield, Target, HelpCircle, ArrowLeft, Gamepad2 } from 'lucide-react';

const weaponDetails = {
  sword: { icon: Sword, name: 'Sword', description: "A blade of pure courage! Ready to slash through your foes." },
  gun: { icon: Target, name: 'Gun', description: "Precision and power! Your aim is true." },
  shield: { icon: Shield, name: 'Shield', description: "An unbreakable defense! Stand tall and protect the realm." },
};

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const weaponType = searchParams.get('weapon') as keyof typeof weaponDetails | null;

  const details = weaponType && weaponDetails[weaponType] 
    ? weaponDetails[weaponType] 
    : { icon: HelpCircle, name: 'Mysterious Item', description: "You've crafted something truly unique!" };
  
  const Icon = details.icon;

  const handlePlayGame = () => {
    if (weaponType) {
      router.push(`/game?weapon=${weaponType}`);
    }
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md text-center shadow-2xl shadow-primary/10">
        <CardHeader>
          <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit mb-4">
            <Icon className="w-16 h-16 text-primary" />
          </div>
          <CardTitle className="font-headline text-3xl">You've Forged a {details.name}!</CardTitle>
          <CardDescription className="text-lg">{details.description}</CardDescription>
        </CardHeader>
        <CardContent>
            <Button onClick={handlePlayGame} className="w-full">
              <Gamepad2 className="mr-2 h-4 w-4" />
              Play Game
            </Button>
        </CardContent>
        <CardFooter>
          <Button onClick={() => router.push('/')} className="w-full" variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Draw Another Weapon
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen w-full items-center justify-center">Loading result...</div>}>
      <ResultContent />
    </Suspense>
  );
}
