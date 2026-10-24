# Collect7

A party version of the push-your-luck card game **Flip 7**. One laptop or TV is the table; everyone plays from their phone.

**Play:** https://zapulam.github.io/Collect7

## How a game goes

1. The game master opens the site on a big screen and taps **Start a new game**. Pick the score to play to (default 200) and an optional turn timer.
2. Players scan the QR code (or type the room code), enter their name and tap **Join**. 2 to 12 players.
3. The master taps **Start game**. Joining locks; a player whose phone drops can scan again on the same phone to get back in.
4. On your turn your phone lights up: **Hit** takes one card, **Stay** banks your points for the round. Play goes round the table until everyone has stayed, busted or been frozen, or someone collects seven different numbers.
5. Scores are added up automatically and shown on the big screen and every phone. The master taps **Next round**.
6. After a round where someone is at or above the target and alone in the lead, they win. A tie for first means another round.

The big screen shows every player's cards. Phones show your own hand, plus how many of each number are on the table and still in the deck, and your chance of busting if you hit.

## Rules

The official Flip 7 rules, with its 94-card deck:

| Cards | |
|---|---|
| Numbers | twelve 12s, eleven 11s … one 1, and one 0 |
| Modifiers | +2, +4, +6, +8, +10 and x2 (one each) |
| Actions | 3 × Freeze, 3 × Flip Three, 3 × Second Chance |

- **Bust:** draw a number you already have and you score 0 for the round.
- **Collect 7:** seven different numbers ends the round at once and scores a 15-point bonus. Everyone else still in banks their points.
- **Scoring:** add your numbers, double that if you hold x2, then add the + modifiers (and the bonus). x2 doesn't double modifiers or the bonus.
- **Freeze:** pick any active player (yourself included); they bank their points and are out for the round.
- **Flip Three:** pick any active player (yourself included); they must take the next three cards, stopping early on a bust or a Collect 7. A Freeze or Flip Three revealed during it is set aside and played afterwards (or discarded if they busted). A Second Chance revealed during it can be used straight away.
- **Second Chance:** keep it; if you draw a duplicate, both are discarded and you carry on. You can only hold one: a spare goes to another active player of your choice, or is discarded if nobody can take it.
- **The deal:** each round starts with one face-up card to everyone, beginning left of the dealer; action cards are played immediately. The deal moves left each round.
- **The deck** isn't reshuffled between rounds. When it runs out, the discard pile is shuffled back in.
- **Turn timer:** if it runs out, an undecided player stays. A Freeze they were choosing for goes on themselves, a Flip Three on a random other player, a spare Second Chance to a random eligible player. The master can also do this by hand with **Stay for them / Choose for them**.

## How it works

- React 19 + Vite + Tailwind CSS 4, deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.
- **The big screen runs the game.** `src/lib/engine.js` is a pure reducer holding the whole state, including the deck order. The big screen saves it in localStorage, so a refresh or a closed tab picks the game back up.
- **Phones talk to it through Firebase Realtime Database** (`src/lib/relay.js`). The big screen publishes a public view of the game (no deck order) to `rooms/{code}/game`. Phones push small requests (`join`, `hit`, `stay`, `choose`) to `rooms/{code}/requests`, which the big screen checks and applies.
- Each phone keeps a private id that only it and the big screen know, so nobody can play another person's turn by copying ids from the public game.
- The QR code is `https://zapulam.github.io/Collect7/?room=CODE`; a `?room=` link loads the phone view.

## Setup

### GitHub Pages

In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**. After that, every merge to `main` deploys.

### Firebase (free Spark plan is plenty)

1. Go to [console.firebase.google.com](https://console.firebase.google.com), **Add project** (Analytics not needed).
2. **Build → Realtime Database → Create database**, start in **locked mode**.
3. In its **Rules** tab, paste the contents of [`database.rules.json`](database.rules.json) and **Publish**.
4. Copy the database URL (like `https://collect7-xxxx-default-rtdb.firebaseio.com`) and the project id into `src/lib/firebaseConfig.js`.

No sign-in is used, so there are no API keys to manage. The free plan allows 100 simultaneous connections (about 7 full 12-player games at once).

## Development

```sh
npm install
npm run dev        # http://localhost:5173/Collect7/
npm test           # engine tests (vitest)
npm run lint
npm run build
```

To play locally without touching the real database, run the Firebase emulator (needs Java) and point the app at it:

```sh
npx firebase-tools emulators:start --only database --project demo-collect7
VITE_FIREBASE_EMULATOR=9000 npm run dev -- --host
```

Open the Network URL Vite prints, so phones on the same Wi-Fi can reach both the page and the emulator. You can put `VITE_FIREBASE_EMULATOR=9000` in `.env.development.local` instead.
