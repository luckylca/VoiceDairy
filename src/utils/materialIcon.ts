import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const glyphMap = MaterialCommunityIcons.getRawGlyphMap() as Record<string, number>;

export function safeMaterialIcon(name: string | undefined, fallback = 'information-outline'): string {
  if (name && Object.prototype.hasOwnProperty.call(glyphMap, name)) {
    return name;
  }

  if (Object.prototype.hasOwnProperty.call(glyphMap, fallback)) {
    return fallback;
  }

  return 'help-circle-outline';
}
