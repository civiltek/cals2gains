"""
Local persistence for drafts sent to Telegram.

Each draft has:
  - draft_id         (caller-supplied, stable identifier)
  - message_id       (Telegram message id once sent)
  - chat_id          (Telegram chat)
  - status           (sent | approved | changes | discarded | expired)
  - title, caption   (mostly for audit / re-send)
  - sent_at, updated_at (ISO-8601 UTC timestamps)
  - feedback         (optional free-text left by the reviewer)

Persistence is a simple JSON file next to the server. Concurrency is not a
concern here — the MCP server is single-process, invoked serially by Claude.
"""

from __future__ import annotations

import json
import os
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

_LOCK = threading.Lock()


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class DraftStore:
    def __init__(self, path: str | os.PathLike[str]) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self._write({"drafts": {}, "last_update_id": 0})

    # ---- low-level --------------------------------------------------------

    def _read(self) -> dict[str, Any]:
        try:
            with self.path.open("r", encoding="utf-8") as fh:
                return json.load(fh)
        except (json.JSONDecodeError, FileNotFoundError):
            return {"drafts": {}, "last_update_id": 0}

    def _write(self, data: dict[str, Any]) -> None:
        tmp = self.path.with_suffix(".tmp")
        with tmp.open("w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
        os.replace(tmp, self.path)

    # ---- public API -------------------------------------------------------

    def record_sent(self, draft_id: str, *, message_id: int, chat_id: str,
                    title: str, caption: str) -> dict[str, Any]:
        with _LOCK:
            data = self._read()
            record = {
                "draft_id": draft_id,
                "message_id": message_id,
                "chat_id": chat_id,
                "status": "sent",
                "title": title,
                "caption": caption,
                "sent_at": _utcnow_iso(),
                "updated_at": _utcnow_iso(),
                "feedback": None,
            }
            data["drafts"][draft_id] = record
            self._write(data)
            return record

    def update_status(self, draft_id: str, status: str,
                      feedback: Optional[str] = None) -> Optional[dict[str, Any]]:
        with _LOCK:
            data = self._read()
            record = data["drafts"].get(draft_id)
            if record is None:
                return None
            record["status"] = status
            if feedback is not None:
                record["feedback"] = feedback
            record["updated_at"] = _utcnow_iso()
            data["drafts"][draft_id] = record
            self._write(data)
            return record

    def get(self, draft_id: str) -> Optional[dict[str, Any]]:
        return self._read()["drafts"].get(draft_id)

    def all(self) -> dict[str, dict[str, Any]]:
        return self._read()["drafts"]

    # ---- update-id cursor (for getUpdates offset) -------------------------

    def get_last_update_id(self) -> int:
        return int(self._read().get("last_update_id", 0))

    def set_last_update_id(self, update_id: int) -> None:
        with _LOCK:
            data = self._read()
            if update_id > int(data.get("last_update_id", 0)):
                data["last_update_id"] = update_id
                self._write(data)
