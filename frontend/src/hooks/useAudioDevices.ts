import { useState, useCallback, useEffect } from "react";

export interface AudioDevice {
  deviceId: string;
  label: string;
}

export function useAudioDevices() {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const loadDevices = useCallback(async () => {
    if (!permissionGranted) {
      const tempStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      tempStream.getTracks().forEach((track) => track.stop());
      setPermissionGranted(true);
    }

    const deviceList = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = deviceList
      .filter((device) => device.kind === "audioinput")
      .map((device) => ({
        deviceId: device.deviceId,
        label:
          device.label.replace(/\s*\([^)]*\)/g, "").trim() ||
          `Microphone ${device.deviceId.slice(0, 8)}`,
      }));

    setDevices(audioInputs);
  }, [permissionGranted]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    const handler = () => loadDevices();
    navigator.mediaDevices.addEventListener("devicechange", handler);
    return () =>
      navigator.mediaDevices.removeEventListener("devicechange", handler);
  }, [loadDevices]);

  return { devices, permissionGranted };
}
