import { SherpaAsr, type AsrResult } from './NativeSherpaAsr';

export async function startVoiceRecord(): Promise<void> {
  await SherpaAsr.startRecord();
}

export async function stopVoiceRecord(): Promise<AsrResult> {
  return SherpaAsr.stopRecord();
}
