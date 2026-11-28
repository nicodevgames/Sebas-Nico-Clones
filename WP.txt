'use client';
import { useParams } from 'next/navigation';
import { GameGrid } from '@/components/lobby/GameGrid';
import { useGames } from '@/lib/lobby/hooks';

export default function ProviderPage() {
  const id = String(useParams<{ id: string }>().id);
  const g = useGames({ provider: id, pageSize: 36 });
  const name = g.items[0]?.providerName ?? id;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{name}</h1>
      <GameGrid games={g.items} loading={g.loading} error={g.error} onRetry={g.reload} hasMore={g.hasMore} onMore={g.loadMore} emptyTitle="Este proveedor no tiene juegos disponibles" />
    </div>
  );
}
