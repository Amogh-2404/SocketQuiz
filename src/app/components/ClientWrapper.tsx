'use client';

import NetworkStats from './NetworkStats';
import VideoGrid from './VideoGrid';

export default function ClientWrapper() {
  return (
    <>
      <NetworkStats />
      <VideoGrid />
    </>
  );
} 