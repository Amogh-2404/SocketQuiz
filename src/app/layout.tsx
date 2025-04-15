import { Inter } from "next/font/google";
import "./globals.css";
import ClientWrapper from './components/ClientWrapper';
import { Metadata } from 'next';
import { GameProvider, useGame } from './context/GameContext';
import { WebRTCProvider } from './context/WebRTCContext';
import NavigationCleanup from './components/NavigationCleanup';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Dynamic Quiz Show",
  description: "A real-time multiplayer quiz game",
};

// Import the client-only WebRTCProviderBridge
import WebRTCProviderBridge from './components/WebRTCProviderBridge';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GameProvider>
          <WebRTCProviderBridge>
            <ClientWrapper />
            {children}
            <NavigationCleanup />
          </WebRTCProviderBridge>
        </GameProvider>
      </body>
    </html>
  );
}
