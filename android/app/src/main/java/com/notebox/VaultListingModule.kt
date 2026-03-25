package com.notebox

import android.content.ContentResolver
import android.net.Uri
import android.os.SystemClock
import android.util.Log
import androidx.documentfile.provider.DocumentFile
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import java.nio.charset.StandardCharsets
import java.text.Collator
import java.util.Locale
import java.util.concurrent.Executors

/**
 * Lists .md files under a SAF directory URI on a background thread, matching JS filter/sort in
 * noteboxStorage (markdown only, exclude sync-conflict names, sort by lastModified desc).
 *
 * Session prepare batches settings init/read, Inbox listing, and General/Inbox.md sync in one
 * executor job to cut bridge round-trips and duplicate SAF work on cold start.
 */
class VaultListingModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val executor = Executors.newSingleThreadExecutor()

  override fun getName(): String = MODULE_NAME

  /**
   * Ensures `.notebox/settings.json`, ensures `Inbox` and `General`, lists Inbox markdown,
   * writes `General/Inbox.md` (same body as `buildInboxMarkdownIndexContent` in noteboxStorage.ts),
   * and returns a map: `settings` (UTF-8 JSON string) and `inboxNotes` (array of uri/name/lastModified).
   */
  @ReactMethod
  fun prepareNoteboxSession(baseUri: String, promise: Promise) {
    executor.execute {
      try {
        val result = prepareNoteboxSessionSync(baseUri.trim())
        reactContext.runOnUiQueueThread { promise.resolve(result) }
      } catch (e: Exception) {
        reactContext.runOnUiQueueThread {
          promise.reject(E_VAULT_PREPARE, e.message ?: "Vault session prepare failed", e)
        }
      }
    }
  }

  @ReactMethod
  fun listMarkdownFiles(directoryUri: String, promise: Promise) {
    executor.execute {
      try {
        val result = buildMarkdownListing(directoryUri)
        reactContext.runOnUiQueueThread { promise.resolve(result) }
      } catch (e: Exception) {
        reactContext.runOnUiQueueThread {
          promise.reject(E_VAULT_LISTING, e.message ?: "Vault listing failed", e)
        }
      }
    }
  }

  private fun buildMarkdownListing(directoryUri: String): WritableArray {
    val uri = Uri.parse(directoryUri)
    val dir =
      DocumentFile.fromSingleUri(reactContext, uri)
        ?: throw IllegalStateException(
          "DocumentFile.fromSingleUri returned null; use JS listing fallback.",
        )
    if (!dir.exists()) {
      throw IllegalStateException(
        "DocumentFile reports directory missing; use JS listing fallback.",
      )
    }
    if (!dir.isDirectory) {
      throw IllegalStateException(
        "URI is not a directory; use JS listing fallback.",
      )
    }
    return rowsToWritableArray(collectMarkdownRows(dir))
  }

  private data class MarkdownRow(val uri: String, val name: String, val lastModified: Long)

  private fun collectMarkdownRows(dir: DocumentFile): List<MarkdownRow> {
    val rows = ArrayList<MarkdownRow>()
    val children =
      dir.listFiles()
        ?: throw IllegalStateException(
          "DocumentFile.listFiles returned null; use JS listing fallback.",
        )
    children.forEach { child ->
      if (child == null || !child.isFile) {
        return@forEach
      }
      val name = child.name ?: return@forEach
      if (!name.endsWith(MARKDOWN_SUFFIX, ignoreCase = true)) {
        return@forEach
      }
      if (name.lowercase().contains(SYNC_CONFLICT_MARKER)) {
        return@forEach
      }
      val lm = child.lastModified()
      rows.add(MarkdownRow(uri = child.uri.toString(), name = name, lastModified = lm))
    }
    rows.sortWith { a, b -> compareDescendingLastModified(a.lastModified, b.lastModified) }
    return rows
  }

  private fun rowsToWritableArray(rows: List<MarkdownRow>): WritableArray {
    val out = Arguments.createArray()
    for (row in rows) {
      val map = Arguments.createMap()
      map.putString("uri", row.uri)
      map.putString("name", row.name)
      map.putDouble("lastModified", row.lastModified.toDouble())
      out.pushMap(map)
    }
    return out
  }

  private fun compareDescendingLastModified(left: Long, right: Long): Int {
    val l = if (left > 0L) left else 0L
    val r = if (right > 0L) right else 0L
    return r.compareTo(l)
  }

  /** Matches JS `generalDirectoryUri + "/" + fileName` for tree document URIs. */
  private fun childDocumentUri(parentUri: Uri, displayName: String): Uri {
    val base = parentUri.toString().trimEnd('/')
    return Uri.parse("$base/$displayName")
  }

  /**
   * Resolves [displayName] under [root] using a single [root.listFiles] pass when possible,
   * then [createDirectory] if missing. Updates [rootChildrenByName] when creating.
   */
  private fun resolveOrCreateRootSubdir(
    root: DocumentFile,
    displayName: String,
    rootChildrenByName: MutableMap<String, DocumentFile>,
  ): DocumentFile {
    var dir = rootChildrenByName[displayName]
    if (dir != null && dir.exists()) {
      if (!dir.isDirectory) {
        throw IllegalStateException("$displayName exists but is not a directory.")
      }
      return dir
    }
    dir =
      root.createDirectory(displayName)
        ?: throw IllegalStateException("Could not create $displayName directory.")
    rootChildrenByName[displayName] = dir
    return dir
  }

  private fun prepareNoteboxSessionSync(baseUriTrimmed: String): WritableMap {
    val sessionT0 = SystemClock.elapsedRealtime()
    val uri = Uri.parse(baseUriTrimmed)
    val root =
      DocumentFile.fromSingleUri(reactContext, uri)
        ?: throw IllegalStateException("DocumentFile.fromSingleUri returned null for vault root.")
    if (!root.exists()) {
      throw IllegalStateException("Vault root is missing.")
    }
    if (!root.isDirectory) {
      throw IllegalStateException("Vault root URI is not a directory.")
    }

    val tRootEnum0 = SystemClock.elapsedRealtime()
    val rootChildren =
      root.listFiles()
        ?: throw IllegalStateException("Vault root listFiles returned null.")
    val rootChildrenByName = HashMap<String, DocumentFile>()
    for (child in rootChildren) {
      if (child == null) {
        continue
      }
      val name = child.name ?: continue
      rootChildrenByName[name] = child
    }
    val tRootEnumMs = SystemClock.elapsedRealtime() - tRootEnum0

    var notebox = resolveOrCreateRootSubdir(root, NOTEBOX_DIR_NAME, rootChildrenByName)
    if (!notebox.isDirectory) {
      throw IllegalStateException(".notebox exists but is not a directory.")
    }

    val tSettings0 = SystemClock.elapsedRealtime()
    var settingsDoc = notebox.findFile(SETTINGS_FILE_NAME)
    val resolver = reactContext.contentResolver
    if (settingsDoc == null || !settingsDoc.exists()) {
      settingsDoc =
        notebox.createFile("application/json", SETTINGS_FILE_NAME)
          ?: throw IllegalStateException("Could not create settings.json.")
      resolver.openOutputStream(settingsDoc.uri)?.use { out ->
        out.write(DEFAULT_SETTINGS_JSON.toByteArray(StandardCharsets.UTF_8))
      } ?: throw IllegalStateException("Could not write default settings.json.")
    }

    if (!settingsDoc.isFile) {
      throw IllegalStateException("settings.json is not a file.")
    }

    val raw =
      resolver.openInputStream(settingsDoc.uri)?.use { input ->
        input.bufferedReader(StandardCharsets.UTF_8).readText()
      } ?: throw IllegalStateException("Could not read settings.json.")

    if (raw.isBlank()) {
      throw IllegalStateException("settings.json is empty.")
    }
    val tSettingsMs = SystemClock.elapsedRealtime() - tSettings0

    var inbox = resolveOrCreateRootSubdir(root, INBOX_DIR_NAME, rootChildrenByName)
    if (!inbox.isDirectory) {
      throw IllegalStateException("Inbox exists but is not a directory.")
    }

    var general = resolveOrCreateRootSubdir(root, GENERAL_DIR_NAME, rootChildrenByName)
    if (!general.isDirectory) {
      throw IllegalStateException("General exists but is not a directory.")
    }

    val tInbox0 = SystemClock.elapsedRealtime()
    val inboxRows = collectMarkdownRows(inbox)
    val tInboxMs = SystemClock.elapsedRealtime() - tInbox0

    val tIndex0 = SystemClock.elapsedRealtime()
    writeInboxMarkdownIndex(general, inboxRows.map { it.name }, resolver)
    val tIndexMs = SystemClock.elapsedRealtime() - tIndex0

    val totalMs = SystemClock.elapsedRealtime() - sessionT0
    Log.i(
      TAG,
      "prepareNoteboxSession: totalMs=$totalMs rootEnumMs=$tRootEnumMs settingsMs=$tSettingsMs " +
        "inboxListMs=$tInboxMs inboxIndexMs=$tIndexMs inboxCount=${inboxRows.size}",
    )

    val out = Arguments.createMap()
    out.putString("settings", raw)
    out.putArray("inboxNotes", rowsToWritableArray(inboxRows))
    return out
  }

  private fun stemFromMarkdownFileName(fileName: String): String {
    return if (fileName.endsWith(MARKDOWN_SUFFIX, ignoreCase = true)) {
      fileName.substring(0, fileName.length - MARKDOWN_SUFFIX.length)
    } else {
      fileName
    }
  }

  /** Matches `buildInboxMarkdownIndexContent` in noteboxStorage.ts (US locale sort for stems). */
  private fun buildInboxMarkdownIndexContent(markdownFileNames: List<String>): String {
    val collator = Collator.getInstance(Locale.US)
    val stems =
      markdownFileNames
        .map { stemFromMarkdownFileName(it) }
        .sortedWith(compareBy(collator) { it })
    val lines = ArrayList<String>()
    lines.add("# Inbox")
    lines.add("")
    for (stem in stems) {
      lines.add("- [[Inbox/$stem|$stem]]")
    }
    return lines.joinToString("\n") + "\n"
  }

  /**
   * Prefer direct child URI (same as JS path concat) so we avoid [DocumentFile.findFile] on huge
   * directories (for example General with many podcast markdown files). Falls back to findFile
   * when the composed URI does not resolve to the index file.
   */
  private fun writeInboxMarkdownIndex(
    generalDir: DocumentFile,
    markdownFileNames: List<String>,
    resolver: ContentResolver,
  ) {
    val body = buildInboxMarkdownIndexContent(markdownFileNames).toByteArray(StandardCharsets.UTF_8)
    val directUri = childDocumentUri(generalDir.uri, INBOX_INDEX_FILE_NAME)
    val directDoc = DocumentFile.fromSingleUri(reactContext, directUri)

    val target: DocumentFile =
      if (directDoc != null && directDoc.exists() && directDoc.isFile) {
        directDoc
      } else {
        val found = generalDir.findFile(INBOX_INDEX_FILE_NAME)
        when {
          found != null && found.exists() && found.isFile -> found
          else ->
            generalDir.createFile("text/markdown", INBOX_INDEX_FILE_NAME)
              ?: throw IllegalStateException("Could not create Inbox.md.")
        }
      }

    if (!target.isFile) {
      throw IllegalStateException("Inbox.md is not a file.")
    }

    val existing = resolver.openInputStream(target.uri)?.use { it.readBytes() }
    if (existing != null && existing.contentEquals(body)) {
      return
    }

    resolver.openOutputStream(target.uri)?.use { out -> out.write(body) }
      ?: throw IllegalStateException("Could not write Inbox.md.")
  }

  companion object {
    const val MODULE_NAME = "NoteboxVaultListing"
    private const val TAG = "NoteboxVaultListing"
    private const val E_VAULT_LISTING = "E_VAULT_LISTING"
    private const val E_VAULT_PREPARE = "E_VAULT_PREPARE"
    private const val MARKDOWN_SUFFIX = ".md"
    private const val SYNC_CONFLICT_MARKER = "sync-conflict"
    private const val NOTEBOX_DIR_NAME = ".notebox"
    private const val SETTINGS_FILE_NAME = "settings.json"
    private const val INBOX_DIR_NAME = "Inbox"
    private const val GENERAL_DIR_NAME = "General"
    private const val INBOX_INDEX_FILE_NAME = "Inbox.md"
    /** Matches `serializeSettings(defaultSettings)` in noteboxStorage.ts (JSON.stringify + trailing newline). */
    private const val DEFAULT_SETTINGS_JSON =
      "{\n  \"displayName\": \"My Notebox\"\n}\n"
  }
}
