'use client';

import NetworkStats from './NetworkStats';
import VideoGrid from './VideoGrid';
import { useGame } from '../context/GameContext';

export default function ClientWrapper() {
  const { mode } = useGame();
  return (
    <>
      <NetworkStats />
      {mode === 'conference' && <VideoGrid />}
    </>
  );
}