package com.voicedairy

import android.hardware.display.DisplayManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Display
import com.facebook.react.ReactActivity

class MainActivity : ReactActivity(), DisplayManager.DisplayListener {
    private val mainHandler = Handler(Looper.getMainLooper())
    private lateinit var displayManager: DisplayManager
    private var requestedRefreshRate = 0f

    private val highRefreshRequest = Runnable {
        requestHighestRefreshRate()
    }

    override fun getMainComponentName(): String = "VoiceDairy"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        displayManager = getSystemService(DisplayManager::class.java)
        scheduleHighRefreshRequests()
    }

    override fun onResume() {
        super.onResume()
        displayManager.registerDisplayListener(this, mainHandler)
        scheduleHighRefreshRequests()
    }

    override fun onPause() {
        displayManager.unregisterDisplayListener(this)
        mainHandler.removeCallbacks(highRefreshRequest)
        super.onPause()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            scheduleHighRefreshRequests()
        }
    }

    override fun onDisplayAdded(displayId: Int) = Unit

    override fun onDisplayRemoved(displayId: Int) = Unit

    override fun onDisplayChanged(displayId: Int) {
        val display = window.decorView.display ?: return
        if (display.displayId != displayId || requestedRefreshRate <= 0f) {
            return
        }

        if (display.refreshRate + 0.5f < requestedRefreshRate) {
            mainHandler.postDelayed(highRefreshRequest, 120L)
        }
    }

    private fun scheduleHighRefreshRequests() {
        mainHandler.removeCallbacks(highRefreshRequest)
        mainHandler.post(highRefreshRequest)
        mainHandler.postDelayed(highRefreshRequest, 250L)
        mainHandler.postDelayed(highRefreshRequest, 1000L)
    }

    fun requestHighestRefreshRate() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return
        }

        val display = window.decorView.display ?: return
        val currentMode = display.mode
        val compatibleModes = display.supportedModes.filter {
            it.physicalWidth == currentMode.physicalWidth &&
                it.physicalHeight == currentMode.physicalHeight
        }
        val bestMode = compatibleModes.maxByOrNull { it.refreshRate } ?: return
        val maxRefreshRate = bestMode.refreshRate
        requestedRefreshRate = maxRefreshRate

        val attributes = window.attributes
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11+ recommends requesting only the desired refresh rate.
            // preferredRefreshRate is ignored when preferredDisplayModeId is non-zero.
            attributes.preferredDisplayModeId = 0
            attributes.preferredRefreshRate = maxRefreshRate
        } else {
            // Android 6-10 needs a concrete display mode to select a higher rate.
            attributes.preferredDisplayModeId = bestMode.modeId
            attributes.preferredRefreshRate = 0f
        }
        window.attributes = attributes

        Log.i(
            REFRESH_LOG_TAG,
            "requested=${formatRate(maxRefreshRate)}Hz " +
                "current=${formatRate(display.refreshRate)}Hz " +
                "mode=${currentMode.modeId} " +
                "supported=${compatibleModes.map { formatRate(it.refreshRate) }.distinct().sorted()}"
        )
    }

    fun getRefreshRateSnapshot(): RefreshRateSnapshot? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return null
        }

        val display = window.decorView.display ?: return null
        val currentMode = display.mode
        val supportedRates = display.supportedModes
            .filter {
                it.physicalWidth == currentMode.physicalWidth &&
                    it.physicalHeight == currentMode.physicalHeight
            }
            .map { it.refreshRate }
            .distinctBy { formatRate(it) }
            .sorted()

        return RefreshRateSnapshot(
            currentRate = display.refreshRate,
            requestedRate = requestedRefreshRate,
            maxSupportedRate = supportedRates.maxOrNull() ?: display.refreshRate,
            supportedRates = supportedRates,
            modeId = currentMode.modeId,
        )
    }

    data class RefreshRateSnapshot(
        val currentRate: Float,
        val requestedRate: Float,
        val maxSupportedRate: Float,
        val supportedRates: List<Float>,
        val modeId: Int,
    )

    private fun formatRate(rate: Float): String = String.format("%.1f", rate)

    companion object {
        private const val REFRESH_LOG_TAG = "VoiceDairyRefresh"
    }
}
