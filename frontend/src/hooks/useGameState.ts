import { useReducer, useEffect, useCallback, useRef } from "react";
import type {
  PlayerSide,
  ServerMessage,
  VisualEffect,
  Verdict,
} from "../types";

interface PerPlayerState {
  health: number;
  hand: string[];
  spellsCast: string[];
  wizardName: string;
  spellName: string | null;
  hitColor: string | null;
  visualEffect: VisualEffect | null;
  transcription: string | null;
  processing: boolean;
  inferredEmojis: string[];
}

interface JudgeState {
  verdict: Verdict | null;
  comment: string | null;
  waiting: boolean;
  spellName: string | null;
  damage: number | null;
}

interface GameUIState {
  left: PerPlayerState;
  right: PerPlayerState;
  judge: JudgeState;
  screenShake: boolean;
  explainPlayer: PlayerSide | null;
  winner: string | null;
  opponentConnected: boolean;
  opponentName: string;
}

type GameAction =
  | { type: "server_message"; msg: ServerMessage }
  | { type: "set_processing"; player: PlayerSide; value: boolean }
  | { type: "clear_screen_shake" }
  | { type: "clear_visual_effect"; side: PlayerSide }
  | { type: "clear_spell_state"; caster: PlayerSide }
  | { type: "connection_lost" };

function defaultPlayerState(): PerPlayerState {
  return {
    health: 100,
    hand: [],
    spellsCast: [],
    wizardName: "",
    spellName: null,
    hitColor: null,
    visualEffect: null,
    transcription: null,
    processing: false,
    inferredEmojis: [],
  };
}

function initialState(): GameUIState {
  return {
    left: defaultPlayerState(),
    right: defaultPlayerState(),
    judge: { verdict: null, comment: null, waiting: false, spellName: null, damage: null },
    screenShake: false,
    explainPlayer: null,
    winner: null,
    opponentConnected: false,
    opponentName: "Opponent",
  };
}

function gameReducer(state: GameUIState, action: GameAction): GameUIState {
  switch (action.type) {
    case "server_message":
      return handleServerMessage(state, action.msg);
    case "set_processing": {
      const player = action.player;
      return { ...state, [player]: { ...state[player], processing: action.value } };
    }
    case "clear_screen_shake":
      return { ...state, screenShake: false };
    case "clear_visual_effect": {
      const s = action.side;
      return { ...state, [s]: { ...state[s], visualEffect: null, hitColor: null } };
    }
    case "clear_spell_state": {
      const c = action.caster;
      return {
        ...state,
        [c]: { ...state[c], inferredEmojis: [], transcription: null, spellName: null },
      };
    }
    case "connection_lost":
      return {
        ...state,
        judge: { ...state.judge, waiting: false },
        left: { ...state.left, processing: false },
        right: { ...state.right, processing: false },
      };
    default:
      return state;
  }
}

function handleServerMessage(state: GameUIState, msg: ServerMessage): GameUIState {
  switch (msg.type) {
    case "transcription": {
      const p = msg.player;
      return {
        ...state,
        [p]: { ...state[p], transcription: msg.text, processing: false },
        judge: { verdict: null, comment: null, waiting: true, spellName: null, damage: null },
      };
    }
    case "spell_fizzle": {
      const p = msg.player;
      const fizzleMsg = msg.reason ?? "Ton sort s'est dissipe...";
      return {
        ...state,
        [p]: { ...state[p], transcription: fizzleMsg, processing: false },
        judge: { ...state.judge, waiting: false },
      };
    }
    case "judge_verdict": {
      let next: GameUIState = {
        ...state,
        judge: {
          verdict: msg.verdict,
          comment: msg.comment,
          waiting: false,
          spellName: msg.spell_name,
          damage: msg.damage,
        },
      };

      if (msg.verdict === "YES" && msg.visual_effect) {
        const caster = msg.caster;
        const target = msg.target;
        next = {
          ...next,
          [caster]: { ...next[caster], spellName: msg.spell_name },
          [target]: {
            ...next[target],
            hitColor: msg.visual_effect.primary_color,
            visualEffect: msg.visual_effect,
          },
          screenShake: msg.damage >= 15,
        };
      }

      if (msg.verdict === "EXPLAIN" && state.explainPlayer === null) {
        next = { ...next, explainPlayer: msg.caster };
      } else {
        next = { ...next, explainPlayer: null };
      }

      return next;
    }
    case "game_state": {
      return {
        ...state,
        left: {
          ...state.left,
          health: msg.left.health,
          hand: msg.left.emoji_hand,
          spellsCast: msg.left.spells_cast ?? state.left.spellsCast,
          wizardName: msg.left.wizard_name ?? state.left.wizardName,
        },
        right: {
          ...state.right,
          health: msg.right.health,
          hand: msg.right.emoji_hand,
          spellsCast: msg.right.spells_cast ?? state.right.spellsCast,
          wizardName: msg.right.wizard_name ?? state.right.wizardName,
        },
        winner: msg.winner,
      };
    }
    case "emoji_inference": {
      const p = msg.player;
      return {
        ...state,
        [p]: { ...state[p], inferredEmojis: msg.inferred_emojis },
      };
    }
    case "player_joined": {
      if (msg.side === "left" || msg.side === "right") {
        return {
          ...state,
          opponentConnected: true,
          opponentName: msg.wizard_name,
        };
      }
      return state;
    }
    case "player_disconnected": {
      return { ...state, opponentConnected: false };
    }
    default:
      return state;
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialState);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Schedule a timeout and track it for cleanup
  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      fn();
      timeoutsRef.current = timeoutsRef.current.filter((t) => t !== id);
    }, ms);
    timeoutsRef.current.push(id);
  }, []);

  // Clean up all pending timeouts on unmount
  useEffect(() => {
    return () => {
      for (const id of timeoutsRef.current) clearTimeout(id);
    };
  }, []);

  const handleServerMessage = useCallback(
    (msg: ServerMessage) => {
      dispatch({ type: "server_message", msg });

      // Side effects: schedule timed cleanups
      if (msg.type === "judge_verdict") {
        if (msg.verdict === "YES" && msg.visual_effect) {
          const cleanupMs = (msg.visual_effect.duration_s + 1) * 1000;
          const target = msg.target;
          const caster = msg.caster;
          scheduleTimeout(() => {
            dispatch({ type: "clear_visual_effect", side: target });
            dispatch({ type: "clear_spell_state", caster });
          }, cleanupMs);

          if (msg.damage >= 15) {
            scheduleTimeout(() => dispatch({ type: "clear_screen_shake" }), 500);
          }
        }

        if (msg.verdict !== "EXPLAIN") {
          const caster = msg.caster;
          scheduleTimeout(() => dispatch({ type: "clear_spell_state", caster }), 4000);
        }
      }
    },
    [scheduleTimeout],
  );

  return { state, dispatch, handleServerMessage };
}
