import { useState, useRef, useCallback, useEffect } from 'react';

export interface Player {
  name: string;
  hp: number;
  mana: number;
  index: number;
}

export interface SpellData {
  spell_name: string;
  element: string;
  damage: number;
  mana_cost: number;
  creativity_score: number;
  emojis: string[];
  description: string;
  commentary: string;
  screen_shake: number;
  color_tint: string;
  actual_damage?: number;
  caster?: string;
  target?: string;
}

export interface GameStateData {
  room_code: string;
  phase: string;
  players: Player[];
  current_turn: number;
  spell_history: string[];
  winner: string | null;
  last_spell: SpellData | null;
}

export type GamePhase = 'lobby' | 'waiting' | 'playing' | 'finished';

interface SpellLogEntry {
  spell: SpellData;
  transcription: string;
  caster: string;
}

export function useGame() {
  const wsRef = useRef<WebSocket | null>(null);
  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [roomCode, setRoomCode] = useState('');
  const [gameState, setGameState] = useState<GameStateData | null>(null);
  const [myPlayerIndex, setMyPlayerIndex] = useState<number>(0);
  const [lastSpell, setLastSpell] = useState<SpellData | null>(null);
  const [spellLog, setSpellLog] = useState<SpellLogEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState('');

  const connect = useCallback((roomCodeParam: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${roomCodeParam}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'game_created':
          setRoomCode(data.room_code);
          setGameState(data.game_state);
          setPhase('waiting');
          break;

        case 'player_joined':
          setGameState(data.game_state);
          setPhase('playing');
          break;

        case 'processing':
          setProcessing(true);
          setTranscription('');
          break;

        case 'transcription':
          setTranscription(data.text);
          break;

        case 'spell_cast':
          setProcessing(false);
          setTranscription('');
          setGameState(data.game_state);
          setLastSpell(data.spell);
          setSpellLog(prev => [...prev, {
            spell: data.spell,
            transcription: data.transcription,
            caster: data.game_state.last_spell?.caster || '',
          }]);
          break;

        case 'game_over':
          setGameState(data.game_state);
          setPhase('finished');
          break;

        case 'error':
          setError(data.message);
          setTimeout(() => setError(''), 3000);
          break;

        case 'player_disconnected':
          setError('Opponent disconnected!');
          break;
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return ws;
  }, []);

  const createGame = useCallback((playerName: string) => {
    const ws = connect('new');
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'create_game',
        player_name: playerName,
      }));
    };
    setMyPlayerIndex(0);
  }, [connect]);

  const joinGame = useCallback((code: string, playerName: string) => {
    const ws = connect(code.toUpperCase());
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'join_game',
        room_code: code.toUpperCase(),
        player_name: playerName,
      }));
    };
    setMyPlayerIndex(1);
  }, [connect]);

  const sendAudio = useCallback((audioBuffer: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(audioBuffer);
    }
  }, []);

  const resetGame = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setPhase('lobby');
    setRoomCode('');
    setGameState(null);
    setLastSpell(null);
    setSpellLog([]);
    setProcessing(false);
    setTranscription('');
    setError('');
  }, []);

  const isMyTurn = gameState ? gameState.current_turn === myPlayerIndex : false;

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return {
    phase,
    roomCode,
    gameState,
    myPlayerIndex,
    lastSpell,
    spellLog,
    processing,
    transcription,
    error,
    isMyTurn,
    createGame,
    joinGame,
    sendAudio,
    resetGame,
    setLastSpell,
  };
}
