import { useEffect, useRef, useCallback, useState } from "react";
import { API_BASE } from "../config";
import type { ServerMessage, ClientMessage } from "../types";

// Singleton AudioContext — lives outside React, immune to re-renders
let audioCtx: AudioContext | null = null;

function playSound(base64: string) {
  if (!audioCtx) audioCtx = new AudioContext();
  const raw = atob(base64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  audioCtx.decodeAudioData(buf).then((decoded) => {
    const source = audioCtx!.createBufferSource();
    source.buffer = decoded;
    source.connect(audioCtx!.destination);
    source.start();
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
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const retriesRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

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
      if (msg.type === "sound_effect") {
        playSound(msg.audio);
        return;
      }
      onMessageRef.current(msg);
    };
  }, [roomCode, side, buildWsUrl]);

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

  return { send, connected };
}
