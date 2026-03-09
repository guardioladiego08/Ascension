package com.tensrfitness.app

import android.app.Activity
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient

class HealthConnectPermissionsRationaleActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val webView = WebView(this)
    webView.webViewClient = WebViewClient()
    webView.settings.allowFileAccess = true
    webView.loadUrl("file:///android_asset/health_connect_privacy_policy.html")

    setContentView(webView)
  }
}
