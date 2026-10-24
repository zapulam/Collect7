import { WifiOff } from 'lucide-react';
import { useRef, useState } from 'react';
import Wordmark from '../components/Wordmark';
import { primaryButton } from '../components/buttons';
import { usePhoneRelay } from '../hooks/usePhoneRelay';
import { useWakeLock } from '../hooks/useWakeLock';
import { relayConfigured } from '../lib/firebaseConfig';
import { normalizeRoomId } from '../lib/room';
import JoinForm from './JoinForm';
import LobbyWait from './LobbyWait';
import PlayView from './PlayView';
import Screen, { Spinner } from './Screen';

function CodeEntry({ title, note }) {
  const [code, setCode] = useState('');
  const valid = normalizeRoomId(code);
  return (
    <Screen>
      <Wordmark className="text-4xl" />
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {note && <p className="text-gray-400 mt-1">{note}</p>}
      </div>
      <form
        className="grid gap-3 w-full max-w-xs"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) window.location.search = `?room=${valid}`;
        }}
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
          placeholder="ROOM CODE"
          aria-label="Room code"
          autoCapitalize="characters"
          autoComplete="off"
          className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3 text-center font-mono text-2xl tracking-[0.2em] outline-none focus:border-indigo-400"
        />
        <button type="submit" className={primaryButton} disabled={!valid}>
          Go
        </button>
      </form>
    </Screen>
  );
}

// What the phone shows once it has the game: the name form, the lobby wait or the play view.
export function PhoneRoom({ game, handle, hostOnline, offset }) {
  const [editingName, setEditingName] = useState(false);
  // If this phone watched the lobby, the cards dealt when the game starts flip in; a phone that
  // opens mid-game just shows its hand.
  const sawLobby = useRef(false);
  if (game.phase === 'lobby') sawLobby.current = true;
  const me = game.players[handle.playerId];
  const joined = me && !me.left;

  if (me?.left) {
    return (
      <Screen>
        <Wordmark className="text-4xl" />
        <p className="text-lg">You were removed from this game.</p>
      </Screen>
    );
  }
  if (!joined || (editingName && game.phase === 'lobby')) {
    if (game.phase !== 'lobby') {
      return (
        <Screen>
          <Wordmark className="text-4xl" />
          <h1 className="text-2xl font-bold">Game in progress</h1>
          <p className="text-gray-400">This game has already started, so joining is locked. You can join the next one.</p>
        </Screen>
      );
    }
    return (
      <JoinForm
        game={game}
        handle={handle}
        me={me}
        onDone={() => setEditingName(false)}
        onCancel={joined ? () => setEditingName(false) : null}
      />
    );
  }
  if (game.phase === 'lobby') {
    return <LobbyWait game={game} meId={handle.playerId} hostOnline={hostOnline} onRename={() => setEditingName(true)} />;
  }
  return <PlayView game={game} handle={handle} hostOnline={hostOnline} offset={offset} initialKnown={sawLobby.current ? 0 : undefined} />;
}

export default function PhoneApp({ initialRoom }) {
  const roomId = normalizeRoomId(initialRoom);
  const room = usePhoneRelay(relayConfigured ? roomId : null);
  useWakeLock(Boolean(roomId));

  if (!relayConfigured) {
    return (
      <Screen>
        <Wordmark className="text-4xl" />
        <p className="text-gray-300">This copy of Collect7 isn&apos;t connected to a database yet.</p>
      </Screen>
    );
  }
  if (!roomId) return <CodeEntry title="Join a game" note="Type the code shown on the big screen." />;
  if (room.failed) {
    return (
      <Screen>
        <WifiOff size={40} className="text-gray-400" />
        <p className="text-lg">Couldn&apos;t connect.</p>
        <button type="button" className={primaryButton} onClick={() => window.location.reload()}>
          Try again
        </button>
      </Screen>
    );
  }
  if (!room.loaded || !room.handle) return <Spinner label="Connecting…" />;
  if (!room.exists) {
    return <CodeEntry title="Game not found" note={`There's no game called ${roomId}. Check the code on the big screen.`} />;
  }
  const { game, handle } = room;
  if (!game) return <Spinner label="Waiting for the big screen…" />;
  return <PhoneRoom game={game} handle={handle} hostOnline={room.hostOnline} offset={room.offset} />;
}
