# Dynamic Quiz Show

![Dynamic Quiz Show](https://img.shields.io/badge/Dynamic-Quiz%20Show-8A2BE2)
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Socket.io](https://img.shields.io/badge/Socket.io-4.6-white)
![Framer Motion](https://img.shields.io/badge/Framer%20Motion-10.16-ff69b4)

> 🎉 **Dynamic Quiz Show** is a real-time, multiplayer quiz game built with modern web technologies. Players can join synchronized sessions, answer time-based questions, and compete for the highest score—all with stunning animations and adaptive networking features.

---

## 📖 Table of Contents

1. [🚀 Overview](#-overview)
2. [🎬 Demo](#-demo)
3. [🛠️ Tech Stack](#️-tech-stack)
4. [🔧 Prerequisites](#-prerequisites)
5. [⚙️ Setup & Installation](#️-setup--installation)
6. [🔑 Environment Variables](#-environment-variables)
7. [📂 Project Structure](#-project-structure)
8. [🖥️ Frontend Guide](#️-frontend-guide)
9. [🔌 Backend Guide](#-backend-guide)
10. [🧠 How It Works (Flow)](#-how-it-works-flow)
11. [📜 Available Scripts](#-available-scripts)
12. [🛠️ Development vs Production](#️-development-vs-production)
13. [✅ Testing](#-testing)
14. [☁️ Deployment](#-deployment)
15. [❓ Troubleshooting & FAQ](#-troubleshooting--faq)
16. [🤝 Contributing](#-contributing)
17. [📄 License](#-license)
18. [🙏 Acknowledgements](#-acknowledgements)

---

## 🚀 Overview

**Dynamic Quiz Show** is a web-based quiz platform where multiple players can join a live session, answer questions in sync, and see real-time score updates. Built with Next.js, Socket.io, and Framer Motion, it combines a responsive UI, smooth animations, and robust server logic to ensure a seamless experience—even over varying network conditions.

**Key Concepts:**
- **Real-time Communication:** Leveraging WebSockets for low-latency data exchange.
- **Session Management:** Automatic lobby creation, player assignment, and maximum concurrent sessions.
- **Adaptive Timing:** Question timers adjust based on measured network latency.
- **Animated Feedback:** Instant answer validation and celebratory result screens.

---

## 🎬 Demo

See it in action:

![Quiz Demo](./public/images/demo.gif)

Live Preview: [http://localhost:3000](http://localhost:3000)

---

## 🛠️ Tech Stack

**Frontend**
- Next.js 14 (React + SSR)
- TypeScript (type safety)
- Tailwind CSS (utility-first styling)
- Framer Motion (animation library)
- Socket.io Client (real-time communication)

**Backend**
- Node.js 18+ (JavaScript runtime)
- Express.js (HTTP server)
- Socket.io Server (WebSocket abstraction)
- Custom modules: session manager, network monitor, question provider

---

## 🔧 Prerequisites

Before you begin, ensure you have:

- **Node.js** v18 or higher
- **npm** v9 or higher (or **yarn** if preferred)

Confirm your versions:

```bash
node -v  # should be v18+
npm -v   # should be v9+
```

---

## ⚙️ Setup & Installation

Follow these steps to get the project running locally.

1. **Clone the repository**
   ```bash
git clone https://github.com/yourusername/dynamic-quiz-show.git
cd dynamic-quiz-show
```

2. **Install dependencies**
   - **Frontend**
     ```bash
cd quiz-show
npm install
```
   - **Backend**
     ```bash
cd server
npm install
```

3. **Configure environment variables**
   See [Environment Variables](#-environment-variables).

4. **Start the servers**
   - **Backend (Socket Server)**
     ```bash
cd server
npm start
```
     - Runs on `http://localhost:5001` by default.

   - **Frontend (Next.js)**
     ```bash
cd ../quiz-show
npm run dev
```
     - Opens at `http://localhost:3000`.

---

## 🔑 Environment Variables

Configure runtime behavior using these variables.

### Frontend (`quiz-show/.env.local`)
```
NEXT_PUBLIC_SERVER_URL=http://localhost:5001
```
- **NEXT_PUBLIC_SERVER_URL**: URL where the Socket server is running.

### Backend (`server/.env`)
```
PORT=5001
QUESTION_BANK_PATH=./data/questions.json
MAX_SESSIONS=3
```
- **PORT**: Port for the Express + Socket.io server.
- **QUESTION_BANK_PATH**: Path to JSON file containing quiz questions.
- **MAX_SESSIONS**: Maximum number of concurrent quiz sessions.

---

## 📂 Project Structure

A high-level look at folders and important files:

```
quiz-show/
├── README.md             # This guide
├── public/               # Static assets (images, fonts, icons)
│   └── images/           # Demo GIF, logos
├── src/                  # Frontend code
│   ├── pages/            # Next.js page components
│   │   ├── index.tsx     # Splash (entry) page
│   │   ├── lobby.tsx     # Lobby interface
│   │   ├── quiz.tsx      # Quiz interface
│   │   └── results.tsx   # Results screen
│   ├── components/       # Reusable UI components
│   ├── hooks/            # Custom hooks (socket, timer)
│   ├── lib/              # Utility modules (socket config, timer logic)
│   └── styles/           # Global CSS & Tailwind config imports
├── server/               # Backend server code
│   ├── index.js          # Express + Socket.io initialization
│   ├── events.js         # List of socket event names & handlers
│   ├── sessionManager.js # Create/track game sessions & lobbies
│   ├── networkMonitor.js # Measure latency & packet loss
│   ├── questionProvider.js # Load questions & pick random set
│   └── data/             # `questions.json` question bank
├── test-server.js        # Local test harness for socket events
├── tailwind.config.js    # Tailwind CSS configuration
├── next.config.js        # Next.js customization
├── package.json          # Project scripts & dependencies
└── tsconfig.json         # TypeScript compiler options
```

Each folder is intentionally organized to separate concerns and improve maintainability.

---

## 🖥️ Frontend Guide

This section dives deeper into the key frontend areas for developers.

### `src/pages`

- **`index.tsx`**:
  - **Purpose**: Landing page where user enters their name and clicks "Join Game".
  - **Key Features**:
    - Controlled input for username.
    - `useSocket` hook invocation.
    - Navigation to `/lobby` on successful join.

- **`lobby.tsx`**:
  - **Purpose**: Show current players, a countdown to game start, and a "Ready" button.
  - **Key Hooks/Components**:
    - `useSocket` for listening to `LOBBY_UPDATE`.
    - `<PlayerList />` and `<Timer />` components for UI.

- **`quiz.tsx`**:
  - **Purpose**: Display one question at a time with multiple-choice answers.
  - **Logic**:
    1. Receive `NEW_QUESTION` event payload → question text + answers.
    2. Start countdown via `useTimer` (uses network latency to adjust duration).
    3. On answer click → emit `SUBMIT_ANSWER`.
    4. Listen for `QUESTION_RESULT` to show correct answer and update score.

- **`results.tsx`**:
  - **Purpose**: Show final scores, ranking animation, and "Play Again" button.
  - **Components**:
    - `<ResultModal />`: Highlights winner with Framer Motion effects.

### `src/components`

Reusable components to keep code DRY:

| Component      | Description                                         |
| -------------- | --------------------------------------------------- |
| `Header`       | Common header with title and connection indicator.  |
| `Timer`        | Visual countdown bar with numeric display.          |
| `QuestionCard` | Renders question text and clickable options.        |
| `PlayerList`   | Shows list of players in lobby or quiz state.       |
| `ResultModal`  | Animated modal for displaying results.              |

### `src/hooks`

- **`useSocket.ts`**:
  - Initializes Socket.io client with URL from env.
  - Handles auto-reconnect logic.
  - Provides helper methods: `onEvent`, `emitEvent`.

- **`useTimer.ts`**:
  - Custom hook wrapping `setInterval` to track seconds left.
  - Accepts base duration and latency adjustment.

### `src/lib`

- **`socket.ts`**: Single instance of `io()` client.
- **`timer.ts`**: Functions to calculate adaptive timeouts based on ping.

### Styles

- **Tailwind CSS**: Utility classes are used in JSX (e.g., `bg-gradient-to-r`, `rounded-lg`).
- **Dark Mode**: Configured in `tailwind.config.js` to support `dark:` variants.

---

## 🔌 Backend Guide

Detailed breakdown of server-side modules.

### `server/index.js`

- Sets up an Express app and attaches a Socket.io server.
- Reads `PORT` from process.env.
- Serves a health-check endpoint at `/health`.

### `server/events.js`

Central definition of all socket event names (avoids typos):

```js
module.exports = {
  JOIN_LOBBY: 'JOIN_LOBBY',
  LOBBY_UPDATE: 'LOBBY_UPDATE',
  START_GAME: 'START_GAME',
  NEW_QUESTION: 'NEW_QUESTION',
  SUBMIT_ANSWER: 'SUBMIT_ANSWER',
  QUESTION_RESULT: 'QUESTION_RESULT',
  GAME_OVER: 'GAME_OVER',
};
```

### `server/sessionManager.js`

- Manages `MAX_SESSIONS` concurrent games.
- Each session tracks:
  - **Players**: array of `{ id, name, socket }`.
  - **Lobby Timer**: 15s countdown after first join.
  - **Game State**: current question index, scores.
- Lifecycle:
  1. Player emits `JOIN_LOBBY` → new session or existing with space.
  2. When lobby timer expires or all ready → emit `START_GAME`.
  3. Loop through `QUESTION_COUNT` questions:
     - `emit NEW_QUESTION`
     - Wait for answers or timeout
     - Calculate results → `emit QUESTION_RESULT`
  4. After final question → `emit GAME_OVER` + final rankings.

### `server/networkMonitor.js`

- Periodically pings clients via Socket.io's `ping` event.
- Measures round-trip time to compute latency.
- Tracks missed pings for packet loss.
- Exports functions for other modules to query average latency.

### `server/questionProvider.js`

- On startup, loads `questions.json` into memory.
- Exposes `getRandomQuestions(count)` to pick `count` unique items.
- Ensures no repeat questions within the same session.

### `test-server.js`

A standalone script to emit and listen to socket events without a frontend:

```bash
node test-server.js
```

Use it for automated testing of server logic.

---

## 🧠 How It Works (Flow)

1. **Client Connects**
   - `useSocket` connects to `NEXT_PUBLIC_SERVER_URL`.
   - On success, emits `JOIN_LOBBY` with `{ name }`.

2. **Lobby Phase**
   - Server groups players into sessions (max 3 concurrent).
   - Emits `LOBBY_UPDATE` every second with:
     ```json
     {
       sessionId,
       players: [ { id, name } ],
       timeRemaining: 10
     }
     ```
   - When `timeRemaining === 0` → `START_GAME`.

3. **Quiz Phase**
   - Server sends `NEW_QUESTION`:
     ```json
     { question: "Text", choices: ["A","B","C","D"], questionNumber: 1 }
     ```
   - Clients start timer via `useTimer(adjustedDuration)`.
   - On answer click → client emits `SUBMIT_ANSWER`:
     ```json
     { sessionId, questionNumber, selectedChoice }
     ```
   - After timer or all answers → server computes correctness & updates scores.
   - Broadcasts `QUESTION_RESULT`:
     ```json
     { correctChoice, scores: [ { id, score } ] }
     ```

4. **Results Phase**
   - After last question, server emits `GAME_OVER`:
     ```json
     { finalRankings: [ { id, name, score } ] }
     ```
   - Frontend navigates to `/results` and shows animations.

---

## 📜 Available Scripts

### Frontend (`quiz-show`)
| Command         | Description                                     |
| --------------- | ----------------------------------------------- |
| `npm run dev`   | Launches Next.js dev server (hot reload)        |
| `npm run build` | Builds for production                          |
| `npm start`     | Starts production server (`next start`)         |
| `npm run lint`  | Runs ESLint checks                              |

### Backend (`server`)
| Command         | Description                                     |
| --------------- | ----------------------------------------------- |
| `npm run dev`   | Starts server with nodemon for auto-reload      |
| `npm start`     | Launches production server                      |
| `npm run lint`  | Runs ESLint (if configured)                     |

---

## 🛠️ Development vs Production

- **Development**:
  - Use `.env.local` / `.env`
  - Run `npm run dev` / `npm run dev`
  - Hot reloading enabled

- **Production**:
  - Build assets (`npm run build`)
  - Serve with `npm start`
  - Ensure environment variables are set on the server

---

## ✅ Testing

> _Testing framework coming soon!_

- You can simulate game flows via `test-server.js`.
- Future: Add Jest for unit tests and Cypress for e2e.

---

## ☁️ Deployment

1. **Frontend**:
   - `npm run build`
   - Deploy `.next` directory to Vercel or Netlify

2. **Backend**:
   - Set env vars (`PORT`, `QUESTION_BANK_PATH`, `MAX_SESSIONS`)
   - `npm start` on a Node-hosting platform

---

## ❓ Troubleshooting & FAQ

- **Socket fails to connect**:
  - Verify `NEXT_PUBLIC_SERVER_URL` matches backend URL.
  - Check CORS settings in `server/index.js`.

- **Lobby never starts**:
  - Confirm `MAX_SESSIONS` not exceeded.
  - Inspect server logs for errors.

- **Styling issues**:
  - Ensure Tailwind classes are compiled.
  - Run `npm run build` after changing `tailwind.config.js`.


---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository.
2. **Create** a new branch:
   ```bash
git checkout -b feature/YourFeature
```
3. **Commit** changes:
   ```bash
git commit -m "Add awesome feature"
```
4. **Push** and **open** a Pull Request.

**Code Guidelines:**
- Use TypeScript types for new code.
- Add tests for new functionality.
- Keep styles within `src/styles` or Tailwind classes.

---

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](../LICENSE) for details.

---

## 🙏 Acknowledgements

- Questions provided by [Open Trivia DB](https://opentdb.com/)
- Icons from [Feather Icons](https://feathericons.com/)
- Animations powered by [Framer Motion](https://www.framer.com/motion/)
