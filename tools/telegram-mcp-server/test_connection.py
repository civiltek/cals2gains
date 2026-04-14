"""
Standalone connection test for the Cals2Gains Telegram approval bot.

What this script does — in order:
  1. Reads TELEGRAM_BOT_TOKEN from the local `.env`.
  2. Calls getUpdates against the Bot API.
  3. If TELEGRAM_CHAT_ID is empty, scans the updates for the most recent
     /start command and writes that chat_id back into `.env`.
  4. Sends a confirmation message to the detected chat_id and reports
     whether the bot responded.

Run this BEFORE registering the MCP server in Cowork. You must have opened
a chat with @cals2gains_approvals_bot and sent /start at least once so
Telegram has an update to expose to getUpdates.

Usage (PowerShell, from this folder):
    python test_connection.py
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

import httpx
from dotenv import dotenv_values

HERE = Path(__file__).resolve().parent
ENV_PATH = HERE / ".env"
TELEGRAM_API = "https://api.telegram.org"


def _read_env() -> dict[str, str]:
    if not ENV_PATH.exists():
        print(f"ERROR: {ENV_PATH} not found. Copy .env.example to .env first.")
        sys.exit(1)
    return {k: (v or "") for k, v in dotenv_values(ENV_PATH).items()}


def _write_chat_id(chat_id: str) -> None:
    """Rewrite .env preserving order/comments, updating TELEGRAM_CHAT_ID."""
    lines = ENV_PATH.read_text(encoding="utf-8").splitlines()
    out: list[str] = []
    replaced = False
    for line in lines:
        if line.strip().startswith("TELEGRAM_CHAT_ID"):
            out.append(f"TELEGRAM_CHAT_ID={chat_id}")
            replaced = True
        else:
            out.append(line)
    if not replaced:
        out.append(f"TELEGRAM_CHAT_ID={chat_id}")
    ENV_PATH.write_text("\n".join(out) + "\n", encoding="utf-8")


def _get_updates(token: str) -> list[dict]:
    url = f"{TELEGRAM_API}/bot{token}/getUpdates"
    r = httpx.post(url, data={"timeout": 0}, timeout=15.0)
    r.raise_for_status()
    payload = r.json()
    if not payload.get("ok"):
        print(f"ERROR: getUpdates returned: {payload.get('description')}")
        sys.exit(1)
    return payload.get("result", [])


def _send_message(token: str, chat_id: str, text: str) -> dict:
    url = f"{TELEGRAM_API}/bot{token}/sendMessage"
    r = httpx.post(url, data={"chat_id": chat_id, "text": text}, timeout=15.0)
    r.raise_for_status()
    payload = r.json()
    if not payload.get("ok"):
        print(f"ERROR: sendMessage returned: {payload.get('description')}")
        sys.exit(1)
    return payload.get("result", {})


def main() -> None:
    env = _read_env()
    token = env.get("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = env.get("TELEGRAM_CHAT_ID", "").strip()

    if not token:
        print("ERROR: TELEGRAM_BOT_TOKEN is empty in .env.")
        sys.exit(1)

    print("Step 1/3  Checking bot credentials with getUpdates ...")
    try:
        updates = _get_updates(token)
    except httpx.HTTPError as exc:
        print(f"ERROR: cannot reach api.telegram.org: {exc}")
        print("Are you online? Is the token correct?")
        sys.exit(1)
    print(f"  getUpdates OK — {len(updates)} pending update(s).")

    if not chat_id:
        print("Step 2/3  TELEGRAM_CHAT_ID is empty. Looking for a /start message ...")
        found: str | None = None
        # Prefer the most recent /start, fall back to the first chat we see.
        for upd in reversed(updates):
            msg = upd.get("message") or upd.get("edited_message")
            if not msg:
                continue
            text = (msg.get("text") or "").strip().lower()
            if text.startswith("/start"):
                found = str(msg["chat"]["id"])
                break
        if not found:
            for upd in updates:
                msg = upd.get("message")
                if msg and "chat" in msg:
                    found = str(msg["chat"]["id"])
                    break
        if not found:
            print("  No /start message found.")
            print(f"  Open Telegram, find @{env.get('BOT_HANDLE','cals2gains_approvals_bot')},")
            print("  press Start (or type /start), then re-run this script.")
            sys.exit(2)
        chat_id = found
        _write_chat_id(chat_id)
        print(f"  Detected chat_id = {chat_id}  (written to .env)")
    else:
        print(f"Step 2/3  TELEGRAM_CHAT_ID already set to {chat_id} — skipping detection.")

    print("Step 3/3  Sending confirmation message ...")
    msg = _send_message(
        token, chat_id,
        "✅ Bot conectado correctamente desde el MCP de Cals2Gains. "
        "Responde con 'ok' para confirmar"
    )
    print(f"  Sent (message_id={msg.get('message_id')}).")
    print()
    print("Now reply 'ok' in Telegram, then re-run this script to verify the round-trip:")
    print("  python test_connection.py --check-reply")
    if len(sys.argv) > 1 and sys.argv[1] == "--check-reply":
        print()
        print("Polling for a reply containing 'ok' (30s) ...")
        deadline = time.time() + 30
        last_seen = 0
        while time.time() < deadline:
            ups = _get_updates(token)
            for u in ups:
                last_seen = max(last_seen, int(u.get("update_id", 0)))
                m = u.get("message")
                if not m:
                    continue
                if str(m.get("chat", {}).get("id")) != chat_id:
                    continue
                if "ok" in (m.get("text", "") or "").lower():
                    print("  ✅ Round-trip OK — bot receives replies.")
                    return
            time.sleep(2)
        print("  ⚠ No 'ok' reply received in 30s. The bot CAN send but check polling/setup.")


if __name__ == "__main__":
    main()
