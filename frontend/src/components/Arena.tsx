import React from 'react'

interface ArenaProps {
  children?: React.ReactNode;
}

export default function Arena({ children }: ArenaProps) {
  return (
    <div className="arena">
      <div className="arena-bg" />
      {children}
    </div>
  );
}
