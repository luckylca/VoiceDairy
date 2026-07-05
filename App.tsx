import React from 'react';
import { SafeAreaView, Text, View } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18 }}>VoiceDairy 初始化成功 🎙️</Text>
        <Text>语音想法整理助手 MVP</Text>
      </View>
    </SafeAreaView>
  );
}
