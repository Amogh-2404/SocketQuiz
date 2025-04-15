# Dynamic Quiz Show

![Dynamic Quiz Show](https://img.shields.io/badge/Dynamic-Quiz%20Show-8A2BE2)
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Socket.io](https://img.shields.io/badge/Socket.io-4.6-white)
![Framer Motion](https://img.shields.io/badge/Framer%20Motion-10.16-ff69b4)

A real-time, multiplayer quiz application featuring synchronized gameplay, adaptive timers, and stunning visual effects.

## 🌟 Overview

Dynamic Quiz Show is a sophisticated web-based multiplayer quiz game where players compete in real-time to answer questions. The application combines cutting-edge frontend animations with robust backend socket programming to deliver a seamless, engaging user experience.

Players join synchronized sessions, complete with lobby waiting rooms, precisely timed question rounds, and dramatic results screens that celebrate winners with visual flourishes.

## ✨ Key Features

### 🎮 Gameplay

- **Real-time Multiplayer**: Compete with players worldwide in synchronized quiz sessions
- **Dynamic Session Formation**: Join existing lobbies or create new ones automatically
- **Synchronized Timers**: All players experience identical question timing
- **Adaptive Question Timing**: Question duration adjusts based on network conditions (10-20 seconds)
- **Instant Feedback**: See correct answers immediately after each question
- **Animated Results**: Celebratory effects for winners with dramatic scoring reveals

### 🎭 User Experience

- **Stunning Visual Design**: Modern glassmorphism effects with gradient backgrounds
- **Fluid Animations**: Powered by Framer Motion for seamless transitions between game states
- **Responsive Layout**: Optimized for both desktop and mobile experiences
- **Dark Mode Support**: Beautiful design in both light and dark themes
- **Interactive Elements**: Dynamic hover and click effects throughout the interface

### 🔧 Technical Features

- **Network Performance Monitoring**: Real-time latency and packet loss tracking
- **Adaptive Timer System**: Question timing adjusts based on network conditions
- **Session Management**: Maximum 3 concurrent game sessions
- **Connection Recovery**: Handling of disconnections with game state persistence
- **Server Health Indicators**: Visual feedback on network conditions
- **Session Synchronization**: All players see identical game states

## 🛠️ Technology Stack

- **Frontend**:
  - [Next.js](https://nextjs.org/) - React framework
  - [TypeScript](https://www.typescriptlang.org/) - Type safety
  - [Framer Motion](https://www.framer.com/motion/) - Advanced animations
  - [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS
  - [Socket.io Client](https://socket.io/docs/v4/client-api/) - Real-time communication

- **Backend**:
  - [Node.js](https://nodejs.org/) - JavaScript runtime
  - [Express](https://expressjs.com/) - Web framework
  - [Socket.io](https://socket.io/) - WebSocket implementation
  - Custom network monitoring and session management

## 📋 Installation

### Prerequisites

- Node.js (v18+)
- npm (v9+)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/dynamic-quiz-show.git
   cd dynamic-quiz-show
   ```

2. Install dependencies:
   ```bash
   # Install frontend dependencies
   cd quiz-show
   npm install

   # Install server dependencies
   cd ../socket-server
   npm install
   ```

3. Environment Setup:
   Create a `.env.local` file in the `quiz-show` directory:
   ```
   NEXT_PUBLIC_SERVER_URL=http://localhost:5001
   ```

## 🚀 Running the Application

### Start the Socket Server:

```bash
cd socket-server
npm start
```

The server will run on port 5001 by default.

### Start the Next.js Frontend:

```bash
cd quiz-show
npm run dev
```

The application will be available at `http://localhost:3000`.

## 🏗️ Architecture

The Dynamic Quiz Show uses a client-server architecture:

### Client Architecture:

```
┌───────────┐      ┌───────────┐      ┌───────────┐
│  SplashScreen   │ ──→ │ LobbyScreen  │ ──→ │ QuizScreen   │
└───────────┘      └───────────┘      └───────────┘
                                            │
                                            ↓
                                      ┌───────────┐
                                      │ResultsScreen│
                                      └───────────┘
```

### Server Architecture:

```
┌──────────────┐     ┌───────────┐     ┌───────────┐
│ Socket Server │ ←→ │ Game Logic │ ←→ │ Session    │
└──────────────┘     └───────────┘     │ Management │
        ↑                               └───────────┘
        │                                     ↑
        │                                     │
┌──────────────┐                       ┌───────────┐
│ Network      │                       │ Question   │
│ Monitoring   │ ←──────────────────→ │ Timer      │
└──────────────┘                       └───────────┘
```

## 🎮 Gameplay Flow

1. **Joining a Game**:
   - Player enters their name and clicks "Join Game"
   - Server assigns player to an existing lobby or creates a new one
   - A 15-second lobby timer starts when the first player joins

2. **Lobby Phase**:
   - Players can see others joining in real-time
   - All players must ready up before the game starts
   - Game automatically starts when the lobby timer expires

3. **Quiz Phase**:
   - Each game consists of 10 questions randomly selected from a bank of 100
   - Questions are synchronized for all players
   - All players have the same amount of time to answer each question
   - Points are awarded for correct answers

4. **Results Phase**:
   - Players are ranked based on their total scores
   - Winner receives special visual celebration effects
   - Players can view complete rankings and scores
   - Option to play again or quit is provided

## 🌐 Network Features

### Performance Monitoring

- Real-time latency monitoring displayed as a colored dot in the corner:
  - 🟢 Green: Good connection (<100ms)
  - 🟡 Yellow: Fair connection (100-300ms)
  - 🔴 Red: Poor connection (>300ms)

- Packet loss tracking
- Adaptive question timing based on average network conditions

### Server Health

- Maximum 3 concurrent game sessions
- Elegant "Server Busy" modal when all sessions are full
- Session persistence for handling disconnects and reconnects

## 🔮 Future Enhancements

- **Spectator Mode**: Allow users to watch ongoing games
- **Custom Rooms**: Let users create private rooms with custom settings
- **Additional Question Types**: Support for images, audio, and video questions
- **User Profiles**: Persistent profiles with statistics and achievements
- **Custom Themes**: User-selectable visual themes
- **Question Categories**: Specialized topic categories for targeted quizzes

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- Question database provided by [Open Trivia DB](https://opentdb.com/)
- Design inspiration from modern UI trends and best practices
