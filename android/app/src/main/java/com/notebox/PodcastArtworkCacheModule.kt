package com.notebox

import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream
import java.security.MessageDigest
import java.util.concurrent.Executors

/**
 * Copies SAF [content://] podcast artwork into app cache on a background thread and returns a
 * [file://] URI so React Native Image / Fresco avoids blocking the UI thread on ContentResolver.
 */
class PodcastArtworkCacheModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val executor = Executors.newSingleThreadExecutor()

  override fun getName(): String = MODULE_NAME

  @ReactMethod
  fun ensureLocalArtworkFile(contentUri: String, promise: Promise) {
    executor.execute {
      try {
        val uri = Uri.parse(contentUri)
        if (uri.scheme != "content") {
          reactContext.runOnUiQueueThread {
            promise.reject(E_INVALID_URI, "Expected content:// URI")
          }
          return@execute
        }

        val cacheSubdir = File(reactContext.cacheDir, CACHE_SUBDIR).apply { mkdirs() }
        val fileName = sha256Hex(contentUri)
        val outFile = File(cacheSubdir, fileName)

        if (outFile.isFile && outFile.length() > 0L) {
          reactContext.runOnUiQueueThread { promise.resolve(toFileUriString(outFile)) }
          return@execute
        }

        if (outFile.exists() && outFile.length() == 0L) {
          outFile.delete()
        }

        val resolver = reactContext.contentResolver
        val input =
          resolver.openInputStream(uri)
            ?: run {
              reactContext.runOnUiQueueThread {
                promise.reject(E_OPEN_FAILED, "Could not open content URI")
              }
              return@execute
            }

        input.use { stream ->
          FileOutputStream(outFile).use { output -> stream.copyTo(output) }
        }

        if (!outFile.isFile || outFile.length() == 0L) {
          outFile.delete()
          reactContext.runOnUiQueueThread {
            promise.reject(E_COPY_FAILED, "Copied file is missing or empty")
          }
          return@execute
        }

        reactContext.runOnUiQueueThread { promise.resolve(toFileUriString(outFile)) }
      } catch (e: Exception) {
        reactContext.runOnUiQueueThread {
          promise.reject(E_COPY_FAILED, e.message ?: "Copy failed", e)
        }
      }
    }
  }

  private fun toFileUriString(file: File): String = "file://${file.absolutePath}"

  private fun sha256Hex(input: String): String {
    val digest = MessageDigest.getInstance("SHA-256")
    val hash = digest.digest(input.toByteArray(Charsets.UTF_8))
    return hash.joinToString("") { b -> String.format("%02x", b.toInt() and 0xff) }
  }

  companion object {
    const val MODULE_NAME = "NoteboxPodcastArtworkCache"
    private const val CACHE_SUBDIR = "podcast-artwork"
    private const val E_INVALID_URI = "E_INVALID_URI"
    private const val E_OPEN_FAILED = "E_OPEN_FAILED"
    private const val E_COPY_FAILED = "E_COPY_FAILED"
  }
}
