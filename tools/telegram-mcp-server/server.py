"""
Telegram approval MCP server for Cals2Gains.

Exposes four tools that together let Claude Cowork push content drafts to
Judith's Telegram chat for human review and collect her feedback:

  - send_draft(title, caption, hashtags, image_path=None, draft_id)
  - send_text(text)
  - poll_replies(since=None)
  - wait_for_reply(draft_id, timeout_seconds=3600)

Credentials (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID) are loaded from a .env
file that sits next to this server.

The server is single-process and intended for local stdio use by Claude
Cowork. Run with:  python server.py
"""

from __future__ import annotations

import logging
import logging.handlers
import os
import time
import uuid
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

from draft_store import DraftStore
from telegram_client import TelegramClient, TelegramError, build_approval_keyboard

# ---------------------------------------------------------------------------
# Paths & config
# ---------------------------------------------------------------------------

HERE = Path(__file__).resolve().parent
load_dotenv(HERE / ".env")

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "").strip()

if not TOKEN or not CHAT_ID:
    raise RuntimeError(
        "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID. "
        "Copy .env.example to .env and fill in both values."
    )

# ---------------------------------------------------------------------------
# Logging (rotating file, token never logged)
# ---------------------------------------------------------------------------

LOG_PATH = HERE / "telegram-mcp.log"
_handler = logging.handlers.RotatingFileHandler(
    LOG_PATH, maxBytes=1_000_000, backupCount=3, encoding="utf-8"
)
_handler.setFormatter(logging.Formatter(
    "%(asctime)s %(levelname)s %(name)s: %(message)s"
))
logging.basicConfig(level=logging.INFO, handlers=[_handler])
log = logging.getLogger("telegram-mcp")

# ---------------------------------------------------------------------------
# Singletons
# ---------------------------------------------------------------------------

client = TelegramClient(TOKEN, CHAT_ID)
store = DraftStore(HERE / "drafts.json")
mcp = FastMCP("telegram-approval")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _format_caption(title: str, caption: str, hashtags: list[str] | str) -> str:
    """Build a Telegram HTML caption with title, body and hashtags."""
    if isinstance(hashtags, str):
        tags = hashtags.strip()
    else:
        tags = " ".join(
            t if t.startswith("#") else f"#{t}" for t in hashtags if t
        )
    # Escape minimal HTML entities in body.
    def esc(s: str) -> str:
        return (
            s.replace("&", "&amp;")
             .replace("<", "&lt;")
             .replace(">", "&gt;")
        )
    parts: list[str] = []
    if title:
        parts.append(f"<b>{esc(title)}</b>")
    if caption:
        parts.append(esc(caption))
    if tags:
        parts.append(tags)
    return "\n\n".join(parts)


def _authorized(chat_id: Any) -> bool:
    """Only accept updates coming from the configured chat."""
    return str(chat_id) == str(CHAT_ID)


def _normalize_update(update: dict[str, Any]) -> Optional[dict[str, Any]]:
    """Turn a raw Telegram update into our reply schema, or None to skip."""
    # Callback from an inline button
    if "callback_query" in update:
        cq = update["callback_query"]
        chat = cq.get("message", {}).get("chat", {}).get("id")
        if not _authorized(chat):
            log.warning("Ignoring callback from unauthorized chat %s", chat)
            return None
        raw = cq.get("data", "")
        action, _, draft_id = raw.partition(":")
        if action not in {"approve", "changes", "discard"}:
            return None
        # Tell Telegram we received it (stops the spinner on the button).
        try:
            client.answer_callback_query(cq["id"], text=f"OK: {action}")
        except TelegramError as exc:
            log.warning("answerCallbackQuery failed: %s", exc)
        return {
            "draft_id": draft_id,
            "action": action,
            "payload": None,
            "timestamp": cq.get("message", {}).get("date"),
            "update_id": update.get("update_id"),
        }
    # Plain text message. We recognise the pattern "<draft_id>: <feedback>".
    if "message" in update:
        msg = update["message"]
        chat = msg.get("chat", {}).get("id")
        if not _authorized(chat):
            log.warning("Ignoring message from unauthorized chat %s", chat)
            return None
        text = msg.get("text", "") or ""
        if not text.strip():
            return None
        draft_id: Optional[str] = None
        payload = text
        if ":" in text:
            head, _, rest = text.partition(":")
            head = head.strip()
            # A draft id is any short token without whitespace (including uuid).
            if head and " " not in head and len(head) <= 64:
                draft_id = head
                payload = rest.strip()
        return {
            "draft_id": draft_id,
            "action": "text",
            "payload": payload,
            "timestamp": msg.get("date"),
            "update_id": update.get("update_id"),
        }
    return None


def _pull_updates() -> list[dict[str, Any]]:
    """Fetch new updates from Telegram, normalize, persist status, return replies."""
    offset = store.get_last_update_id() + 1 if store.get_last_update_id() else None
    try:
        raw_updates = client.get_updates(
            offset=offset,
            timeout=0,
            allowed_updates=["message", "callback_query"],
        )
    except TelegramError as exc:
        log.error("getUpdates failed: %s", exc)
        return []

    replies: list[dict[str, Any]] = []
    max_update_id = store.get_last_update_id()
    for upd in raw_updates:
        update_id = int(upd.get("update_id", 0))
        if update_id > max_update_id:
            max_update_id = update_id
        norm = _normalize_update(upd)
        if norm is None:
            continue
        # Persist state transition if we know the draft.
        did = norm.get("draft_id")
        action = norm["action"]
        if did and store.get(did):
            status_map = {
                "approve": "approved",
                "changes": "changes",
                "discard": "discarded",
            }
            if action in status_map:
                store.update_status(did, status_map[action])
            elif action == "text":
                # Store feedback text without flipping status.
                store.update_status(did, store.get(did)["status"], feedback=norm["payload"])
        replies.append(norm)

    if max_update_id:
        store.set_last_update_id(max_update_id)
    return replies


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------

@mcp.tool()
def send_draft(
    title: str,
    caption: str,
    hashtags: list[str],
    draft_id: Optional[str] = None,
    image_path: Optional[str] = None,
) -> dict[str, Any]:
    """Send a content draft to Telegram with Approve / Changes / Discard buttons.

    Args:
        title:      Short headline shown bold at the top of the message.
        caption:    Body of the post (will be escaped for HTML).
        hashtags:   List of tags (with or without leading '#').
        draft_id:   Stable identifier. If omitted a UUID is generated.
        image_path: Optional absolute path to an image file. If provided,
                    the message is sent as a photo with caption; otherwise
                    as a plain text message.

    Returns:
        { draft_id, message_id, chat_id, status: "sent" }
    """
    did = draft_id or f"drf-{uuid.uuid4().hex[:10]}"
    body = _format_caption(title, caption, hashtags)
    keyboard = build_approval_keyboard(did)
    try:
        if image_path:
            result = client.send_photo(image_path, body, reply_markup=keyboard)
        else:
            result = client.send_message(body, reply_markup=keyboard)
    except TelegramError as exc:
        log.error("send_draft %s failed: %s", did, exc)
        raise
    except FileNotFoundError as exc:
        raise RuntimeError(f"image_path not found: {image_path}") from exc

    message_id = int(result.get("message_id", 0))
    record = store.record_sent(
        did, message_id=message_id, chat_id=CHAT_ID, title=title, caption=caption
    )
    log.info("Sent draft %s (message_id=%s)", did, message_id)
    return {
        "draft_id": did,
        "message_id": message_id,
        "chat_id": CHAT_ID,
        "status": record["status"],
    }


@mcp.tool()
def send_text(text: str) -> dict[str, Any]:
    """Send a plain text notification to the approval chat.

    Use for short operational notices ("scheduler kicked off", "post went live")
    rather than content that needs a decision.
    """
    result = client.send_message(text, parse_mode="HTML")
    return {"message_id": int(result.get("message_id", 0)), "chat_id": CHAT_ID}


@mcp.tool()
def poll_replies(since: Optional[int] = None) -> list[dict[str, Any]]:
    """Return any pending replies since the last poll.

    Args:
        since: Ignored. The server tracks its own Telegram update offset in
               drafts.json. The parameter is kept for forward-compat.

    Returns:
        List of { draft_id, action, payload, timestamp } where action is
        one of 'approve' | 'changes' | 'discard' | 'text'. For 'text' the
        draft_id may be None if the user didn't prefix "<draft_id>:".
    """
    replies = _pull_updates()
    # Strip internal fields before returning.
    return [
        {k: v for k, v in r.items() if k != "update_id"}
        for r in replies
    ]


@mcp.tool()
def wait_for_reply(draft_id: str, timeout_seconds: int = 3600) -> dict[str, Any]:
    """Block until a decision arrives for `draft_id`, or timeout.

    A "decision" is one of approve / changes / discard. Free-text messages
    tagged with the same draft_id are captured as feedback on the record
    but do NOT end the wait — we keep waiting for an actual button press.

    Args:
        draft_id:         The id returned by send_draft.
        timeout_seconds:  Max seconds to wait. Default 1h.

    Returns:
        { draft_id, action, payload, timestamp, status }
        where status is one of 'approved' | 'changes' | 'discarded' | 'expired'.
    """
    if not store.get(draft_id):
        raise RuntimeError(f"Unknown draft_id: {draft_id}")

    deadline = time.time() + max(1, int(timeout_seconds))
    collected_feedback: list[str] = []
    poll_interval = 3.0  # seconds

    while time.time() < deadline:
        for reply in _pull_updates():
            if reply.get("draft_id") != draft_id:
                continue
            if reply["action"] == "text" and reply.get("payload"):
                collected_feedback.append(reply["payload"])
                continue
            if reply["action"] in {"approve", "changes", "discard"}:
                status_map = {
                    "approve": "approved",
                    "changes": "changes",
                    "discard": "discarded",
                }
                status = status_map[reply["action"]]
                feedback = " \n".join(collected_feedback) or None
                if feedback:
                    store.update_status(draft_id, status, feedback=feedback)
                return {
                    "draft_id": draft_id,
                    "action": reply["action"],
                    "payload": feedback,
                    "timestamp": reply.get("timestamp"),
                    "status": status,
                }
        time.sleep(poll_interval)

    store.update_status(draft_id, "expired")
    return {
        "draft_id": draft_id,
        "action": "timeout",
        "payload": " \n".join(collected_feedback) or None,
        "timestamp": int(time.time()),
        "status": "expired",
    }




# ---------------------------------------------------------------------------
# Media tools
# ---------------------------------------------------------------------------

_PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv"}
_PHOTO_MAX_BYTES = 10 * 1024 * 1024   # 10 MB
_MEDIA_MAX_BYTES = 50 * 1024 * 1024   # 50 MB


def _validate_file(file_path: str, max_bytes: int, allowed_ext: set[str] | None = None) -> Path:
    """Validate that a file exists, is within size limits, and has an allowed extension."""
    p = Path(file_path)
    if not p.exists():
        raise RuntimeError(f"Archivo no encontrado: {file_path}")
    if not p.is_file():
        raise RuntimeError(f"La ruta no es un archivo: {file_path}")
    size = p.stat().st_size
    if size == 0:
        raise RuntimeError(f"El archivo esta vacio: {file_path}")
    if size > max_bytes:
        raise RuntimeError(
            f"Archivo demasiado grande: {size / (1024*1024):.1f} MB "
            f"(maximo {max_bytes / (1024*1024):.0f} MB)"
        )
    if allowed_ext is not None:
        ext = p.suffix.lower()
        if ext not in allowed_ext:
            raise RuntimeError(
                f"Extension no soportada: {ext}. "
                f"Permitidas: {', '.join(sorted(allowed_ext))}"
            )
    return p


@mcp.tool()
def send_photo(file_path: str, caption: Optional[str] = None) -> dict[str, Any]:
    """Send a photo (JPG/PNG/GIF/WebP) to the Telegram chat.

    Args:
        file_path: Absolute path to the image file on Windows (e.g. C:\\Users\\Judit\\image.jpg).
        caption:   Optional caption text (HTML supported).

    Returns:
        { message_id, chat_id }
    """
    _validate_file(file_path, _PHOTO_MAX_BYTES, _PHOTO_EXTENSIONS)
    try:
        result = client.send_photo(file_path, caption or "", parse_mode="HTML")
    except TelegramError as exc:
        log.error("send_photo failed: %s", exc)
        raise
    message_id = int(result.get("message_id", 0))
    log.info("Sent photo %s (message_id=%s)", file_path, message_id)
    return {"message_id": message_id, "chat_id": CHAT_ID}


@mcp.tool()
def send_video(file_path: str, caption: Optional[str] = None) -> dict[str, Any]:
    """Send a video (MP4/MOV/AVI/MKV) to the Telegram chat.

    Args:
        file_path: Absolute path to the video file on Windows.
        caption:   Optional caption text (HTML supported).

    Returns:
        { message_id, chat_id }
    """
    _validate_file(file_path, _MEDIA_MAX_BYTES, _VIDEO_EXTENSIONS)
    try:
        result = client.send_video_file(file_path, caption=caption)
    except TelegramError as exc:
        log.error("send_video failed: %s", exc)
        raise
    message_id = int(result.get("message_id", 0))
    log.info("Sent video %s (message_id=%s)", file_path, message_id)
    return {"message_id": message_id, "chat_id": CHAT_ID}


@mcp.tool()
def send_document(file_path: str, caption: Optional[str] = None) -> dict[str, Any]:
    """Send any file as a document to the Telegram chat.

    Args:
        file_path: Absolute path to the file on Windows.
        caption:   Optional caption text (HTML supported).

    Returns:
        { message_id, chat_id }
    """
    _validate_file(file_path, _MEDIA_MAX_BYTES)
    try:
        result = client.send_document_file(file_path, caption=caption)
    except TelegramError as exc:
        log.error("send_document failed: %s", exc)
        raise
    message_id = int(result.get("message_id", 0))
    log.info("Sent document %s (message_id=%s)", file_path, message_id)
    return {"message_id": message_id, "chat_id": CHAT_ID}


@mcp.tool()
def send_media_group(file_paths: list[str], caption: Optional[str] = None) -> dict[str, Any]:
    """Send a group of photos/videos as an album to the Telegram chat.

    Args:
        file_paths: List of 2-10 absolute paths to photo or video files.
                    Extension determines type: .mp4/.mov/.avi/.mkv -> video, rest -> photo.
        caption:    Optional caption (HTML). Applied to the first item only.

    Returns:
        { message_ids: [...], chat_id, count }
    """
    if len(file_paths) < 2:
        raise RuntimeError("send_media_group requiere al menos 2 archivos.")
    if len(file_paths) > 10:
        raise RuntimeError("send_media_group permite maximo 10 archivos.")
    for fp in file_paths:
        ext = Path(fp).suffix.lower()
        if ext in _VIDEO_EXTENSIONS:
            _validate_file(fp, _MEDIA_MAX_BYTES, _VIDEO_EXTENSIONS)
        else:
            _validate_file(fp, _PHOTO_MAX_BYTES, _PHOTO_EXTENSIONS)
    try:
        results = client.send_media_group_files(file_paths, caption=caption)
    except TelegramError as exc:
        log.error("send_media_group failed: %s", exc)
        raise
    message_ids = [int(r.get("message_id", 0)) for r in results]
    log.info("Sent media group (%d items, message_ids=%s)", len(message_ids), message_ids)
    return {"message_ids": message_ids, "chat_id": CHAT_ID, "count": len(message_ids)}

# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    log.info("Starting telegram-approval MCP server")
    mcp.run()
