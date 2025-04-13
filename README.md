# Dynamic Multiplayer Quiz Show

A real-time, multiplayer quiz game where players join timed sessions and compete over 10-question rounds drawn randomly from a bank of 100 questions. The application emphasizes engaging and visually stunning user experiences with smooth animations and transitions powered by Framer Motion.

## Features

- **Real-time Multiplayer Experience**: Join live quiz sessions with other players
- **Dynamic Room Formation**: A 15-second countdown timer starts when the first player joins, with new players being added to the same session
- **Limited Concurrent Sessions**: Server supports a maximum of 3 concurrent sessions with an elegant "Server Busy" notification
- **Animated UI**: Beautiful transitions and animations using Framer Motion
- **Dark Mode**: Toggleable dark mode with smooth transition animations
- **Responsive Design**: Works on various screen sizes
- **Real-time Scoring**: Live score updates and synchronized timers
- **Results Screen**: Animated medal reveal and confetti celebration for winners

## Tech Stack

- **Frontend**: Next.js/React.js with TypeScript
- **Animation**: Framer Motion for smooth transitions and animations
- **Styling**: Tailwind CSS for responsive design
- **Real-time Communication**: Socket.IO for WebSocket connections
- **Backend**: Node.js with Express

## Getting Started

### Prerequisites

- Node.js (v18 or newer)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd quiz-show
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

### Running the Application

To run both the frontend and backend simultaneously:

```bash
npm run dev:all
# or
yarn dev:all
```

This will start:
- The Next.js frontend on [http://localhost:3000](http://localhost:3000)
- The Socket.IO server on [http://localhost:5000](http://localhost:5000)

To run them separately:

**Frontend only:**
```bash
npm run dev
# or
yarn dev
```

**Backend only:**
```bash
npm run server
# or
yarn server
```

For development with auto-restart on changes:
```bash
npm run dev:server
# or
yarn dev:server
```

## Game Rules

1. **Session Formation**:
   - A 15-second countdown begins when the first player clicks "Play"
   - Players joining within that countdown join the same session
   - The game starts when the countdown ends, even with just one player

2. **Quiz Mechanics**:
   - Each game consists of 10 randomly selected questions from a bank of 100
   - Players have 15 seconds to answer each question
   - All players see the same questions simultaneously
   - After all questions are answered, scores are calculated and rankings displayed

3. **Scoring**:
   - Players receive points for correct answers
   - No points for incorrect answers or no answer
   - Final rankings are displayed at the end with animated medal reveal

## Project Structure

```
quiz-show/
├── server/             # Node.js socket server
│   ├── index.js        # Server implementation
│   └── data/           # Question data
│       └── questions.json  # Question bank (100 questions)
├── src/
│   ├── app/            # Next.js application
│   │   ├── components/ # React components
│   │   ├── context/    # React context providers
│   │   ├── hooks/      # Custom React hooks
│   │   ├── styles/     # CSS styles
│   │   ├── utils/      # Utility functions
│   │   ├── page.tsx    # Main application page
│   │   └── layout.tsx  # App layout
│   └── ...
├── public/             # Static assets
└── ...
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.
