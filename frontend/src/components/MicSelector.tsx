import type { AudioDevice } from "../hooks/useAudioDevices";

interface MicSelectorProps {
  devices: AudioDevice[];
  value: string;
  onChange: (deviceId: string) => void;
}

export function MicSelector({ devices, value, onChange }: MicSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white/80 outline-none focus:border-white/40 w-full max-w-[200px] truncate"
    >
      {devices.map((device) => (
        <option key={device.deviceId} value={device.deviceId}>
          {device.label}
        </option>
      ))}
    </select>
  );
}
