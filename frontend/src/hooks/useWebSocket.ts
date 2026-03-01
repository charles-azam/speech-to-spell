import { useEffect, useRef, useCallback, useState } from "react";
import { API_BASE } from "../config";
import type { ServerMessage, ClientMessage, CommentatorSpeaker } from "../types";

// Singleton AudioContext — lives outside React, immune to re-renders
let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playSound(base64: string) {
  const ctx = getAudioCtx();
  const raw = atob(base64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  ctx.decodeAudioData(buf).then((decoded) => {
    const source = ctx.createBufferSource();
    source.buffer = decoded;
    source.connect(ctx.destination);
    source.start();
  });
}

function playSoundAsync(base64: string): Promise<void> {
  const ctx = getAudioCtx();
  const raw = atob(base64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return ctx.decodeAudioData(buf).then((decoded) => {
    return new Promise<void>((resolve) => {
      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);
      source.onended = () => resolve();
      source.start();
    });
  });
}

const MAX_RETRIES = 20;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;

export function useWebSocket(
  onMessage: (msg: ServerMessage) => void,
  roomCode: string | null,
  side: string,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<CommentatorSpeaker | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const retriesRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  // Commentator audio queue
  const commentatorQueueRef = useRef<{ speaker: CommentatorSpeaker; audio: string }[]>([]);
  const playingCommentatorRef = useRef(false);

  const processCommentatorQueue = useCallback(async () => {
    if (playingCommentatorRef.current) return;
    playingCommentatorRef.current = true;
    while (commentatorQueueRef.current.length > 0) {
      const item = commentatorQueueRef.current.shift()!;
      setCurrentSpeaker(item.speaker);
      await playSoundAsync(item.audio);
      // Small pause between lines for natural pacing
      await new Promise<void>((r) => setTimeout(r, 300));
    }
    setCurrentSpeaker(null);
    playingCommentatorRef.current = false;
  }, []);

  const buildWsUrl = useCallback((code: string, s: string): string => {
    if (API_BASE) {
      const url = new URL(API_BASE);
      const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
      return `${wsProtocol}//${url.host}/ws/${code}?side=${s}`;
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws/${code}?side=${s}`;
  }, []);

  const connect = useCallback(() => {
    if (!roomCode || unmountedRef.current) return;

    const wsUrl = buildWsUrl(roomCode, side);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      retriesRef.current = 0;
    };

    ws.onclose = () => {
      setConnected(false);
      if (unmountedRef.current) return;

      if (retriesRef.current < MAX_RETRIES) {
        const delay = Math.min(BASE_DELAY_MS * 2 ** retriesRef.current, MAX_DELAY_MS);
        retriesRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      }
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as ServerMessage;
      if (msg.type === "sound_effect" || msg.type === "judge_voice") {
        playSound(msg.audio);
        return;
      }
      if (msg.type === "commentator_voice") {
        commentatorQueueRef.current.push({ speaker: msg.speaker, audio: msg.audio });
        processCommentatorQueue();
        return;
      }
      onMessageRef.current(msg);
    };
  }, [roomCode, side, buildWsUrl, processCommentatorQueue]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { send, connected, currentSpeaker };
}
