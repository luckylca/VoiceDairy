import React from 'react';
import { ScrollView } from 'react-native';
import { Text } from 'react-native-paper';

export function ReviewResultScreen() {
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text variant="headlineSmall" style={{ fontWeight: '800' }}>
        整理结果确认
      </Text>
      <Text style={{ marginTop: 8, opacity: 0.72 }}>
        第一阶段 MVP 当前采用“智能整理并保存”的快速流程。后续会在这里加入条目编辑、删除、分类修改、时间补全和确认保存。
      </Text>
    </ScrollView>
  );
}
