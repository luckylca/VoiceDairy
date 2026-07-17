# Keep llama.rn JNI and bridge classes when release minification is enabled.
-keep class com.rnllama.** { *; }
-dontwarn com.rnllama.**
