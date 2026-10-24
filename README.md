# Collect7

Collect7 is a party version of the push-your-luck card game **Flip 7**, built with React, Tailwind CSS, and Firebase. One laptop or TV is the table; everyone plays from their phone.

Play for free [here](https://zapulam.github.io/Collect7).

![React](https://img.shields.io/badge/React-19.1-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38B2AC) ![Vite](https://img.shields.io/badge/Vite-6-646CFF) ![Firebase](https://img.shields.io/badge/Firebase-Realtime_Database-FFCA28)

## 🎮 Game Overview

Collect7 is a press-your-luck card game for 2 to 12 players. On your turn you either **Hit** to take another card or **Stay** to bank your points. Draw a number you already hold and you bust, losing everything for the round. Collect seven different numbers and the round ends at once with a bonus. The big screen shows every player's cards while each phone shows only its own hand.

## ✨ Features

- **📺 Shared Screen Table**: The big screen runs the game and shows every player's hand, the deck and the scores
- **📲 Phone Controllers**: Players scan a QR code (or type the room code), enter a name and play Hit/Stay from their own phone
- **🃏 Official Deck & Rules**: The full 94-card deck with Freeze, Flip Three, Second Chance, the x2 and + modifiers, and the Collect 7 bonus
- **🔁 Smart Turns**: Round-robin turns, a rotating dealer, and a reshuffle of the discard pile when the deck runs out
- **⏱️ Turn Timer**: Optional timer that stays automatically for a stalled player
- **🕹️ Master Controls**: Stay or choose for a stuck player, and remove players
- **🔦 Spotlight Turns**: The big screen puts the current player's hand front and centre, with everyone else's score and a condensed hand along the bottom
- **🎞️ Card Flips & Counters**: New cards flip over one at a time and scores roll like an old mechanical counter, with stamps for a bust, a banked score, a freeze and Collect 7
- **⏳ Paced Turns**: A 3, 4 or 5 second pause between turns locks the next player's phone, so nobody can rush
- **📊 Phone Tally**: Per-number count of cards on the table and left in the deck, plus your chance of busting if you hit
- **🏆 Scoring**: Round scores and running totals, with ties at the target forcing another round
- **🎉 Confetti & Animations**: Celebrations for wins and Collect 7
- **♻️ Refresh-Proof**: The big screen saves the game, so a refresh or closed tab picks it back up
- **🔌 Reconnect Anywhere**: A player whose phone drops can scan again on the same phone to get back in
- **🔒 Cheat-Resistant**: Each phone has a private id, and the deck order never leaves the big screen

## 🚀 Getting Started

### Prerequisites

- Node.js (version 20 or higher)
- npm package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/zapulam/Collect7.git
   cd Collect7
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173/Collect7/` (or the address shown in your terminal)

### Building for Production

```bash
npm run build
npm run preview
```

## 🎯 How to Play

### Game Setup
- The game master opens the site on a big screen and taps **Start a new game**
- Pick the score to play to (default 200) and an optional turn timer
- Players scan the QR code (or type the room code), enter their name and tap **Join**: 2 to 12 players
- The master taps **Start game**, and joining locks

### Gameplay
1. **Your Turn**: Your phone lights up. **Hit** takes one card, **Stay** banks your points for the round
2. **Take Turns**: Play goes round the table until everyone has stayed, busted or been frozen, or someone collects seven different numbers
3. **Score the Round**: Points are added up automatically and shown on the big screen and every phone
4. **Next Round**: The master taps **Next round**
5. **Win Condition**: After a round where someone is at or above the target and alone in the lead, they win
6. **Tie**: A tie for first means another round

### Cards

| Cards | |
|---|---|
| 🔢 Numbers | twelve 12s, eleven 11s … one 1, and one 0 |
| ➕ Modifiers | +2, +4, +6, +8, +10 and x2 (one each) |
| ⚡ Actions | 3 × Freeze, 3 × Flip Three, 3 × Second Chance |

### Rules
- 💥 **Bust**: Draw a number you already have and you score 0 for the round
- 7️⃣ **Collect 7**: Seven different numbers ends the round at once and scores a 15-point bonus. Everyone else still in banks their points
- 🧮 **Scoring**: Add your numbers, double that if you hold x2, then add the + modifiers (and the bonus). x2 doesn't double modifiers or the bonus
- 🧊 **Freeze**: Pick any active player (yourself included). They bank their points and are out for the round
- 🎰 **Flip Three**: Pick any active player (yourself included). They must take the next three cards, stopping early on a bust or a Collect 7. A Freeze or Flip Three revealed during it is set aside and played afterwards (or discarded if they busted). A Second Chance revealed during it can be used straight away
- 🛟 **Second Chance**: Keep it. If you draw a duplicate, both are discarded and you carry on. You can only hold one: a spare goes to another active player of your choice, or is discarded if nobody can take it
- 🤝 **The Deal**: Each round starts with one face-up card to everyone, beginning left of the dealer. Action cards are played immediately. The deal moves left each round
- 🔀 **The Deck**: It isn't reshuffled between rounds. When it runs out, the discard pile is shuffled back in
- ⏱️ **Turn Timer**: If it runs out, an undecided player stays. A Freeze they were choosing for goes on themselves, a Flip Three on a random other player, a spare Second Chance to a random eligible player. The master can also do this by hand with **Stay for them / Choose for them**

## 📲 Phones

Everyone plays from their own phone, so the big screen can show every hand without giving anything away:

1. On the big screen, tap **Start a new game**. A QR code and a room code appear in the lobby.
2. Each player scans the QR code (or opens the site and types the code) and enters a name.
3. Your phone shows your hand, **Hit** and **Stay**, a target picker when you play a Freeze or Flip Three, and the tally of cards on the table and left in the deck.
4. Round scores and totals show on every phone between rounds.

The QR code is `https://zapulam.github.io/Collect7/?room=CODE`. A `?room=` link loads the phone view.

### How it works

The site is a static GitHub Pages app. Phones and the big screen talk through a [Firebase Realtime Database](https://firebase.google.com/docs/database) (free Spark plan) that the browser calls directly.

- **The big screen runs the game.** `src/lib/engine.js` is a pure reducer holding the whole state, including the deck order. The big screen saves it in localStorage.
- The big screen publishes a public view of the game (no deck order) to `rooms/{code}/game`.
- Phones push small requests (`join`, `hit`, `stay`, `choose`) to `rooms/{code}/requests`, which the big screen checks against the rules and applies.
- Each phone keeps a private id that only it and the big screen know, so nobody can play another person's turn by copying ids from the public game.

### One-time Firebase setup

1. Go to the [Firebase console](https://console.firebase.google.com) and **Add project**. Google Analytics isn't needed.
2. Open **Build → Realtime Database → Create Database**, pick a location, and choose **Start in locked mode**.
3. In the **Rules** tab, replace everything with the contents of [`database.rules.json`](database.rules.json) and click **Publish**. Or, with the [Firebase CLI](https://firebase.google.com/docs/cli): `npx firebase-tools login`, then `npx firebase-tools deploy --only database` (the project is set in `.firebaserc`). If the rules are missing or out of date, the big screen shows "The database rejected this game" and phones can't join.
4. Copy the **database URL** (top of the Data tab) and the **project ID** (Project settings → General) into `src/lib/firebaseConfig.js`.
5. Merge into `main`, which deploys the site.

These two values are public identifiers, not secrets: the rules decide what anyone can read or write. They keep the database root private, so rooms can't be listed, they only accept valid room codes, and inside a room they only accept data shaped like the game's (no extra fields, checked values, capped lengths). No sign-in is used, so there are no API keys to manage.

The free plan allows 100 simultaneous connections (about 7 full 12-player games at once).

### Testing locally with the Firebase emulator

You don't need a Firebase project to try the phone feature locally:

```bash
npx firebase-tools emulators:start --only database --project demo-collect7   # needs Java
VITE_FIREBASE_EMULATOR=9000 npm run dev -- --host
```

Open the board at the **Network** address Vite prints (not `localhost`), then scan the QR code with a phone on the same Wi-Fi. The phone then reaches both the page and the emulator through your computer's address. You can also put `VITE_FIREBASE_EMULATOR=9000` in `.env.development.local` instead of the command line. The emulator setting is ignored in production builds.

## 🔧 Development

### Available Scripts
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm test`: Run the engine tests (vitest)
- `npm run lint`: Run ESLint

### Previewing the phone UI

With `npm run dev` running, open `http://localhost:5173/Collect7/?preview` to see and play the phone screens without a database. The real game engine runs in the page, and buttons along the top jump between the join form, lobby, your turn, waiting, round over and game over. Shrink the window to phone width (or use your browser's device toolbar) to see it as a phone.

Open `http://localhost:5173/Collect7/?preview=host` to watch the big screen with bot players taking turns, including the pause between turns, card flips, score counters and bust animation. Both pages only exist in development builds.

## 🌐 Deployment

Merging into `main` deploys the site automatically. A GitHub Actions workflow (`.github/workflows/deploy.yml`) installs, lints, tests, builds and publishes it to GitHub Pages. Pull requests get the same lint, test and build check, without publishing.

One-time setup: in the repo's **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

If you encounter any issues or have questions, please open an issue on the GitHub repository.

---

**Enjoy playing Collect7! 🎉**
