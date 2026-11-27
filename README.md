# Collect7

**Play now: https://collect7-b4930.firebaseapp.com/**

A party version of the push-your-luck card game **Flip 7**, built with React, Tailwind CSS and Firebase. One laptop or TV is the table and everyone plays from their phone. 2 to 12 players.

## How to play

1. On the big screen, tap **Start a new game**, pick a target score (default 200) and an optional turn timer.
2. Players scan the QR code (or type the room code), enter a name and tap **Join**. The master taps **Start game**.
3. On your turn, **Hit** to take another card or **Stay** to bank your points. Round scores show on the big screen and every phone, and the master taps **Next round**.
4. The first player at or above the target and alone in the lead wins. A tie for first means another round.

The big screen shows every hand, and each phone shows only its own.

### Rules

- **Bust:** draw a number you already hold and you score 0 for the round.
- **Collect 7:** seven different numbers ends the round at once with a 15-point bonus. Everyone still in banks their points.
- **Scoring:** add your numbers, double that if you hold x2, then add the + modifiers and any bonus.
- **Freeze:** pick an active player (yourself included). They bank their points and are out for the round.
- **Flip Three:** pick an active player (yourself included). They take the next three cards, stopping early on a bust or Collect 7.
- **Second Chance:** keep it, and a duplicate is discarded instead of busting you. You can hold only one, so a spare goes to another player.
- **Deck:** 94 cards. Twelve 12s, eleven 11s and so on down to one 1 and one 0; +2, +4, +6, +8, +10 and x2; three each of Freeze, Flip Three and Second Chance. When it runs out, the discard pile is shuffled back in.
- **Turn timer:** if it runs out, an undecided player stays. The master can also stay or choose for a stuck player.

## Run it locally

Needs Node.js 20 or higher.

```bash
git clone https://github.com/zapulam/Collect7.git
cd Collect7
npm install
npm run dev
```

Open `http://localhost:5173/`. Other scripts: `npm test`, `npm run lint`, `npm run build`, `npm run preview`.

With `npm run dev` running, `/?preview` plays the phone screens against a local fake game, and `/?preview=host` shows the big screen with bot players. Both exist only in development builds.

To try real phones without a Firebase project, use the emulator (needs Java), then open the board at the **Network** address Vite prints and scan the QR code on the same Wi-Fi:

```bash
npx firebase-tools emulators:start --only database --project demo-collect7
VITE_FIREBASE_EMULATOR=9000 npm run dev -- --host
```

## How it works

The site is a static app on Firebase Hosting. Phones and the big screen talk through a [Firebase Realtime Database](https://firebase.google.com/docs/database) (free Spark plan) that the browser calls directly.

- The big screen runs the game. `src/lib/engine.js` is a pure reducer holding the whole state, including the deck order, which never leaves the big screen.
- It publishes a public view of the game to `rooms/{code}/game`. Phones send small requests (`join`, `hit`, `stay`, `choose`) to `rooms/{code}/requests`, which the big screen checks and applies.
- Each phone has a private id, so nobody can play another person's turn.
- [`database.rules.json`](database.rules.json) keeps the database root private and only accepts data shaped like the game's. The values in `src/lib/firebaseConfig.js` are public identifiers, not secrets, and no sign-in or API keys are used.

To use your own Firebase project, create a Realtime Database, publish the rules (`npx firebase-tools deploy --only database`) and put your database URL and project ID in `src/lib/firebaseConfig.js`. Without the rules, the big screen shows "The database rejected this game".

## Deployment

Merging into `main` deploys to Firebase Hosting through `.github/workflows/deploy.yml`. A `ci` job lints, tests and builds every push and pull request with read-only access. A `deploy` job then runs only for `main`, in the `production` environment, and signs in with Workload Identity Federation, so no service account key or other secret is stored. One-time setup is in [`docs/deployment.md`](docs/deployment.md).

## Contributing

Fork the repo, create a branch, and open a pull request. For problems or questions, open an issue.
