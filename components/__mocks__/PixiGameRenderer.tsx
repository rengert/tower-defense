/**
 * Mock for PixiGameRenderer used in Jest tests.
 *
 * Replaces the WebGL/pixi.js canvas with a plain View containing a test
 * button that triggers onCellPress(0, 0) so tower-placement tests can work
 * without a real WebGL context.
 */
import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';

interface Props {
  onTick: (dtMs: number) => void;
  onCellPress: (row: number, col: number) => void;
  gameStateRef: React.MutableRefObject<unknown>;
  running: boolean;
  buildMode: boolean;
}

export default function PixiGameRenderer({
  onCellPress,
}: Props) {
  return (
    <View testID="pixi-game-renderer">
      <TouchableOpacity
        accessibilityLabel="Cell row 0 col 0"
        onPress={() => onCellPress(0, 0)}
      >
        <Text>Cell 0,0</Text>
      </TouchableOpacity>
    </View>
  );
}
