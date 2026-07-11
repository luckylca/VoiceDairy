#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE_DIR="${VOICE_DAIRY_ASR_CACHE_DIR:-${ROOT_DIR}/.cache/voicedairy-asr}"
ASSET_DIR="${ROOT_DIR}/android/app/src/main/assets/models/sensevoice"
JNI_DIR="${ROOT_DIR}/android/app/src/main/jniLibs/arm64-v8a"

MODEL_NAME="sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17"
MODEL_ARCHIVE="${MODEL_NAME}.tar.bz2"
MODEL_URL="https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/${MODEL_ARCHIVE}"

SHERPA_VERSION="1.13.4"
JNI_ARCHIVE="sherpa-onnx-v${SHERPA_VERSION}-android.tar.bz2"
JNI_URL="https://github.com/k2-fsa/sherpa-onnx/releases/download/v${SHERPA_VERSION}/${JNI_ARCHIVE}"

mkdir -p "${CACHE_DIR}" "${ASSET_DIR}" "${JNI_DIR}"

log() {
  printf '[VoiceDairy ASR] %s\n' "$*"
}

download() {
  local url="$1"
  local output="$2"

  if [[ -s "${output}" ]]; then
    log "Using cached $(basename "${output}")"
    return
  fi

  log "Downloading ${url}"
  if command -v curl >/dev/null 2>&1; then
    curl --fail --location --retry 3 --retry-delay 2 --output "${output}.part" "${url}"
  elif command -v wget >/dev/null 2>&1; then
    wget --tries=3 --output-document="${output}.part" "${url}"
  else
    log "Error: curl or wget is required to download ASR assets."
    exit 1
  fi

  mv "${output}.part" "${output}"
}

prepare_model() {
  local model_file="${ASSET_DIR}/model.int8.onnx"
  local tokens_file="${ASSET_DIR}/tokens.txt"

  if [[ -s "${model_file}" && -s "${tokens_file}" ]]; then
    log "SenseVoice model assets are ready."
    return
  fi

  local archive_path="${CACHE_DIR}/${MODEL_ARCHIVE}"
  local extract_dir
  extract_dir="$(mktemp -d "${CACHE_DIR}/model.XXXXXX")"
  trap 'rm -rf "${extract_dir}"' RETURN

  download "${MODEL_URL}" "${archive_path}"
  tar -xjf "${archive_path}" -C "${extract_dir}"

  local extracted_model
  local extracted_tokens
  extracted_model="$(find "${extract_dir}" -type f -name 'model.int8.onnx' -print -quit)"
  extracted_tokens="$(find "${extract_dir}" -type f -name 'tokens.txt' -print -quit)"

  if [[ -z "${extracted_model}" || -z "${extracted_tokens}" ]]; then
    log "Error: downloaded SenseVoice archive does not contain model.int8.onnx and tokens.txt."
    exit 1
  fi

  cp "${extracted_model}" "${model_file}"
  cp "${extracted_tokens}" "${tokens_file}"
  log "Installed SenseVoice model into Android assets."
}

prepare_jni() {
  local jni_file="${JNI_DIR}/libsherpa-onnx-jni.so"

  if [[ -s "${jni_file}" ]]; then
    log "sherpa-onnx Android JNI libraries are ready."
    return
  fi

  local archive_path="${CACHE_DIR}/${JNI_ARCHIVE}"
  local extract_dir
  extract_dir="$(mktemp -d "${CACHE_DIR}/jni.XXXXXX")"
  trap 'rm -rf "${extract_dir}"' RETURN

  download "${JNI_URL}" "${archive_path}"
  tar -xjf "${archive_path}" -C "${extract_dir}"

  local source_dir="${extract_dir}/jniLibs/arm64-v8a"
  if [[ ! -d "${source_dir}" ]]; then
    source_dir="$(find "${extract_dir}" -type d -path '*/jniLibs/arm64-v8a' -print -quit)"
  fi

  if [[ -z "${source_dir}" || ! -d "${source_dir}" ]]; then
    log "Error: downloaded Android archive does not contain arm64-v8a JNI libraries."
    exit 1
  fi

  find "${source_dir}" -maxdepth 1 -type f -name '*.so' -exec cp {} "${JNI_DIR}/" \;

  if [[ ! -s "${jni_file}" ]]; then
    log "Error: libsherpa-onnx-jni.so was not installed."
    exit 1
  fi

  log "Installed sherpa-onnx ${SHERPA_VERSION} arm64-v8a JNI libraries."
}

prepare_model
prepare_jni
log "ASR assets are ready. The next Android build can run fully offline."
