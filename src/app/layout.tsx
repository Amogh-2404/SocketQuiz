import { Inter } from "next/font/google";
import "./globals.css";
import ClientWrapper from './components/ClientWrapper';
import { Metadata } from 'next';
import { GameProvider } from './context/GameContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Dynamic Quiz Show",
  description: "A real-time multiplayer quiz game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GameProvider>
          {children}
          <ClientWrapper />
        </GameProvider>
      </body>
    </html>
  );
}
