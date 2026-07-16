package com.voicedairy

import android.os.Build
import android.os.Bundle
import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
    override fun getMainComponentName(): String = "VoiceDairy"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        preferHighestRefreshRate()
    }

    override fun onResume() {
        super.onResume()
        preferHighestRefreshRate()
    }

    private fun preferHighestRefreshRate() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return
        }

        val display = window.decorView.display ?: return
        val currentMode = display.mode
        val bestMode = display.supportedModes
            .filter {
                it.physicalWidth == currentMode.physicalWidth &&
                    it.physicalHeight == currentMode.physicalHeight
            }
            .maxByOrNull { it.refreshRate }
            ?: return

        if (bestMode.refreshRate <= currentMode.refreshRate + 0.5f) {
            return
        }

        val attributes = window.attributes
        attributes.preferredDisplayModeId = bestMode.modeId
        attributes.preferredRefreshRate = bestMode.refreshRate
        window.attributes = attributes
    }
}
