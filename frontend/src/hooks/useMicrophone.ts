import { useRef, useState, useCallback } from "react";

export function useMicrophone(
  onRecordingComplete: (audioBase64: string) => void,
) {
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const onCompleteRef = useRef(onRecordingComplete);
  onCompleteRef.current = onRecordingComplete;

  const startRecording = useCallback(async (deviceId?: string) => {
    // Stop any previous stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId
          ? { deviceId: { exact: deviceId } }
          : true,
      });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "Unknown";
      if (name === "NotAllowedError") {
        setMicError("Microphone permission denied. Allow mic access in your browser settings and reload.");
      } else if (name === "NotFoundError") {
        setMicError("No microphone found. Connect a mic and reload.");
      } else {
        setMicError(`Microphone error: ${name}. Check your browser settings.`);
      }
      console.warn("getUserMedia failed:", err);
      return;
    }

    // Clear any previous error on success
    setMicError(null);
    streamRef.current = stream;

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
    });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        onCompleteRef.current(base64);
      };
      reader.readAsDataURL(blob);
    };

    mediaRecorder.start();
    setRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }, []);

  return { recording, startRecording, stopRecording, micError };
}
