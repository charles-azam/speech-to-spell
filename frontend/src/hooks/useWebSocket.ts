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

export function useWebSocket(
  onMessage: (msg: ServerMessage) => void,
  roomCode: string | null,
  side: string,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!roomCode) return;

    // Determine host: use API_BASE if set (production), otherwise window.location.host (dev proxy)
    let wsUrl: string;
    if (API_BASE) {
      // API_BASE is like "https://api.example.com" — convert to ws(s)://
      const url = new URL(API_BASE);
      const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${wsProtocol}//${url.host}/ws/${roomCode}?side=${side}`;
    } else {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${protocol}//${window.location.host}/ws/${roomCode}?side=${side}`;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as ServerMessage;
      // Play sound immediately, outside React's render cycle
      if (msg.type === "sound_effect") {
        playSound(msg.audio);
        return;
      }
      onMessageRef.current(msg);
    };

    return () => {
      ws.close();
    };
  }, [roomCode, side]);

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { send, connected };
}
