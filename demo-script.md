# Dynamic Multiplayer Quiz Show - Demo Script

## Introduction (0:00 - 0:30)
- Brief introduction to the Dynamic Multiplayer Quiz Show application
- Highlight the key features: real-time multiplayer, animated UI, limited concurrent sessions
- Explain the tech stack: Next.js, Socket.IO, Framer Motion

## Application Overview (0:30 - 1:00)
- Show the initial splash screen with parallax effect
- Demonstrate the dark mode toggle button
- Point out the clean, modern UI design

## Session Joining Flow (1:00 - 2:30)
- Click "Play" to start a new game session
- Show the lobby screen with the 15-second countdown timer
- Explain that up to 3 concurrent sessions are supported
- Simulate another player joining (with second browser window)
- Show how the timer adjusts when a new player joins
- Demonstrate the player list updating in real-time

## Server Busy Scenario (2:30 - 3:00)
- Show what happens when there are already 3 active sessions
- Demonstrate the "Server Busy" modal with animations
- Explain the UX benefits of providing clear feedback to users

## Game Play (3:00 - 4:30)
- Follow through the quiz starting after the lobby countdown ends
- Show the question screen with the 15-second timer per question
- Demonstrate selecting an answer and the UI response
- Show how the timer continues even after answering (synchronization feature)
- Proceed through a couple of questions to demonstrate the flow

## Question Transition Animations (4:30 - 5:00)
- Focus on the smooth transition between questions
- Highlight the Framer Motion animations
- Show how correct/incorrect answers are displayed

## Game Completion & Results (5:00 - 6:00)
- Show the end of the game after all questions are answered
- Demonstrate the results calculation screen with animations
- Showcase the medal reveal and confetti animation for winners
- Point out the score display and ranking system

## Player Controls (6:00 - 6:30)
- Demonstrate the "Quit" button functionality during a game
- Show how a player can return to the home screen after a game
- Explain how the session cleanup works when players leave

## Technical Highlights (6:30 - 7:00)
- Briefly explain the Socket.IO implementation for real-time communication
- Highlight the session management logic
- Mention the responsive design working across device sizes

## Conclusion (7:00 - 7:30)
- Summarize the key features demonstrated
- Mention potential future enhancements
- Show where to find the source code and installation instructions

## Call to Action (7:30 - 8:00)
- Encourage viewers to try out the application
- Provide contact information for feedback
- Thank the audience for watching 