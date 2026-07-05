import React from 'react';
import { Chip } from 'react-native-paper';

export function TagChip({ label }: { label: string }) {
  return (
    <Chip compact style={{ marginRight: 6, marginTop: 6 }}>
      {label}
    </Chip>
  );
}
