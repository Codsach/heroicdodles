'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Loader2, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Score = {
  id: string;
  name: string;
  score: number;
  weapon: string;
};

export default function LeaderboardPage() {
  const router = useRouter();
  const [scores, setScores] = useState<Score[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "scores"), orderBy("score", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const scoresData: Score[] = [];
      querySnapshot.forEach((doc) => {
        scoresData.push({ id: doc.id, ...doc.data() } as Score);
      });
      setScores(scoresData);
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching scores:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center">
          <Trophy className="w-16 h-16 mx-auto text-yellow-400" />
          <CardTitle className="text-4xl font-headline mt-4">Hall of Heroes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ol className="space-y-4">
              {scores.map((score, index) => (
                <li key={score.id} className="flex items-center justify-between p-4 rounded-md bg-white shadow">
                  <div className="flex items-center space-x-4">
                    <span className="text-lg font-bold text-primary">{index + 1}.</span>
                    <div>
                      <p className="font-semibold text-lg">{score.name}</p>
                      <p className="text-sm text-muted-foreground">Wielded a {score.weapon}</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-accent">{score.score} pts</p>
                </li>
              ))}
            </ol>
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
