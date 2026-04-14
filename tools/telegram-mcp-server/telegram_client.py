"""
Thin HTTP wrapper around the Telegram Bot API.

Only the endpoints the MCP server needs:
  - sendPhoto
  - sendMessage
  - getUpdates
  - answerCallbackQuery

We deliberately avoid python-telegram-bot to keep dependencies light
and the surface area auditable.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

import json
import os

import httpx

log = logging.getLogger("telegram-mcp.client")

TELEGRAM_API = "https://api.telegram.org"


class TelegramError(RuntimeError):
    """Raised when the Telegram API returns ok=false or an HTTP error."""


class TelegramClient:
    """Minimal HTTP client for the Telegram Bot API."""

    def __init__(self, token: str, chat_id: str | int, timeout: float = 30.0) -> None:
        if not token:
            raise ValueError("TELEGRAM_BOT_TOKEN is required.")
        if not chat_id:
            raise ValueError("TELEGRAM_CHAT_ID is required.")
        self._token = token
        self.chat_id = str(chat_id)
        self._base = f"{TELEGRAM_API}/bot{token}"
        self._client = httpx.Client(timeout=timeout)

    # ---- internal ---------------------------------------------------------

    def _call(self, method: str, *, data: Optional[dict[str, Any]] = None,
              files: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        url = f"{self._base}/{method}"
        # NEVER log the URL (contains the token). Only log the method.
        log.debug("Telegram call: %s", method)
        try:
            resp = self._client.post(url, data=data, files=files)
        except httpx.HTTPError as exc:
            raise TelegramError(f"HTTP error calling {method}: {exc}") from exc
        if resp.status_code >= 400:
            # Don't include token. Response body is safe.
            raise TelegramError(
                f"{method} returned HTTP {resp.status_code}: {resp.text[:400]}"
            )
        payload = resp.json()
        if not payload.get("ok"):
            raise TelegramError(
                f"{method} failed: {payload.get('description', 'unknown error')}"
            )
        return payload.get("result", {})

    # ---- public API -------------------------------------------------------

    def send_message(self, text: str, *, parse_mode: str = "HTML",
                     reply_markup: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        data: dict[str, Any] = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": parse_mode,
            "disable_web_page_preview": "true",
        }
        if reply_markup is not None:
            data["reply_markup"] = json.dumps(reply_markup)
        return self._call("sendMessage", data=data)

    def send_photo(self, image_path: str, caption: str, *, parse_mode: str = "HTML",
                   reply_markup: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        data: dict[str, Any] = {
            "chat_id": self.chat_id,
            "caption": caption,
            "parse_mode": parse_mode,
        }
        if reply_markup is not None:
            data["reply_markup"] = json.dumps(reply_markup)
        with open(image_path, "rb") as fh:
            files = {"photo": (os.path.basename(image_path), fh, "application/octet-stream")}
            return self._call("sendPhoto", data=data, files=files)

    def get_updates(self, offset: Optional[int] = None,
                    timeout: int = 0,
                    allowed_updates: Optional[list[str]] = None) -> list[dict[str, Any]]:
        data: dict[str, Any] = {"timeout": timeout}
        if offset is not None:
            data["offset"] = offset
        if allowed_updates is not None:
            data["allowed_updates"] = json.dumps(allowed_updates)
        result = self._call("getUpdates", data=data)
        # When no updates, Telegram returns [] which _call coerces to {} via .get.
        return result if isinstance(result, list) else []

    def answer_callback_query(self, callback_query_id: str, text: Optional[str] = None) -> None:
        data: dict[str, Any] = {"callback_query_id": callback_query_id}
        if text:
            data["text"] = text
        self._call("answerCallbackQuery", data=data)


    def send_video_file(self, file_path: str, caption: Optional[str] = None,
                        *, parse_mode: str = "HTML") -> dict[str, Any]:
        """Send a video via sendVideo. Max 50 MB."""
        data: dict[str, Any] = {
            "chat_id": self.chat_id,
            "parse_mode": parse_mode,
        }
        if caption:
            data["caption"] = caption
        with open(file_path, "rb") as fh:
            files = {"video": (os.path.basename(file_path), fh, "video/mp4")}
            return self._call("sendVideo", data=data, files=files)

    def send_document_file(self, file_path: str, caption: Optional[str] = None,
                           *, parse_mode: str = "HTML") -> dict[str, Any]:
        """Send any file via sendDocument. Max 50 MB."""
        data: dict[str, Any] = {
            "chat_id": self.chat_id,
            "parse_mode": parse_mode,
        }
        if caption:
            data["caption"] = caption
        with open(file_path, "rb") as fh:
            files = {"document": (os.path.basename(file_path), fh, "application/octet-stream")}
            return self._call("sendDocument", data=data, files=files)

    def send_media_group_files(self, file_paths: list[str],
                               caption: Optional[str] = None) -> list[dict[str, Any]]:
        """Send 2-10 photos/videos as an album via sendMediaGroup."""
        media_descriptors: list[dict[str, Any]] = []
        files: dict[str, Any] = {}
        for idx, fp in enumerate(file_paths):
            attach_key = f"media{idx}"
            ext = os.path.splitext(fp)[1].lower()
            media_type = "video" if ext in (".mp4", ".mov", ".avi", ".mkv") else "photo"
            entry: dict[str, Any] = {
                "type": media_type,
                "media": f"attach://{attach_key}",
            }
            if idx == 0 and caption:
                entry["caption"] = caption
                entry["parse_mode"] = "HTML"
            media_descriptors.append(entry)
            fh = open(fp, "rb")  # noqa: SIM115 — closed by httpx after upload
            files[attach_key] = (os.path.basename(fp), fh, "application/octet-stream")

        data: dict[str, Any] = {
            "chat_id": self.chat_id,
            "media": json.dumps(media_descriptors),
        }
        try:
            result = self._call("sendMediaGroup", data=data, files=files)
            return result if isinstance(result, list) else [result]
        finally:
            for _, (_, fh, _) in files.items():
                fh.close()
    def close(self) -> None:
        self._client.close()


def build_approval_keyboard(draft_id: str) -> dict[str, Any]:
    """Inline keyboard with Approve / Changes / Discard buttons for a given draft."""
    return {
        "inline_keyboard": [[
            {"text": "✅ Aprobar", "callback_data": f"approve:{draft_id}"},
            {"text": "✏️ Cambios", "callback_data": f"changes:{draft_id}"},
            {"text": "❌ Descartar", "callback_data": f"discard:{draft_id}"},
        ]]
    }
