"""
IMAP/SMTP MCP Server for cPanel-hosted email accounts.

Exposes tools for:
  - listing mailbox folders
  - listing recent messages in a folder
  - searching messages (FROM, TO, SUBJECT, TEXT, date ranges)
  - reading a full message (headers + body + attachments metadata)
  - sending a message via SMTP
  - marking messages read/unread/flagged
  - moving messages between folders (e.g. to Trash)

Credentials are loaded from environment variables. Never hard-code them.

Environment variables (see config.example.env):
  IMAP_HOST, IMAP_PORT, IMAP_USE_SSL
  SMTP_HOST, SMTP_PORT, SMTP_USE_SSL
  MAIL_USERNAME, MAIL_PASSWORD
  MAIL_FROM_NAME  (optional, defaults to username)
  DEFAULT_FOLDER  (optional, defaults to INBOX)
"""

from __future__ import annotations

import email
import email.header
import imaplib
import os
import smtplib
import ssl
from datetime import datetime, timedelta
from email.message import EmailMessage
from email.utils import parseaddr, parsedate_to_datetime
from typing import Any, Optional

from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

load_dotenv()

IMAP_HOST = os.getenv("IMAP_HOST", "")
IMAP_PORT = int(os.getenv("IMAP_PORT", "993"))
IMAP_USE_SSL = os.getenv("IMAP_USE_SSL", "true").lower() == "true"

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "true").lower() == "true"

MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", MAIL_USERNAME)
DEFAULT_FOLDER = os.getenv("DEFAULT_FOLDER", "INBOX")

if not (IMAP_HOST and MAIL_USERNAME and MAIL_PASSWORD):
    raise RuntimeError(
        "Missing required environment variables. "
        "Set IMAP_HOST, MAIL_USERNAME, MAIL_PASSWORD in the .env file."
    )


# ---------------------------------------------------------------------------
# MCP server
# ---------------------------------------------------------------------------

mcp = FastMCP("imap-mail")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _imap_connect() -> imaplib.IMAP4:
    """Open an IMAP connection and LOGIN. Caller must .logout()."""
    if IMAP_USE_SSL:
        conn = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
    else:
        conn = imaplib.IMAP4(IMAP_HOST, IMAP_PORT)
    conn.login(MAIL_USERNAME, MAIL_PASSWORD)
    return conn


def _decode_header(raw: Optional[str]) -> str:
    """Decode an RFC 2047 encoded header into a plain string."""
    if raw is None:
        return ""
    parts = email.header.decode_header(raw)
    out = []
    for text, enc in parts:
        if isinstance(text, bytes):
            try:
                out.append(text.decode(enc or "utf-8", errors="replace"))
            except LookupError:
                out.append(text.decode("utf-8", errors="replace"))
        else:
            out.append(text)
    return "".join(out)


def _extract_body(msg: email.message.Message) -> dict[str, Any]:
    """Extract plain text and html bodies + attachment metadata from a parsed message."""
    text_body = ""
    html_body = ""
    attachments: list[dict[str, Any]] = []

    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            disp = (part.get("Content-Disposition") or "").lower()

            if "attachment" in disp or (part.get_filename() and ctype not in ("text/plain", "text/html")):
                payload = part.get_payload(decode=True) or b""
                attachments.append(
                    {
                        "filename": _decode_header(part.get_filename()) or "(unnamed)",
                        "content_type": ctype,
                        "size_bytes": len(payload),
                    }
                )
                continue

            if ctype == "text/plain" and not text_body:
                payload = part.get_payload(decode=True) or b""
                charset = part.get_content_charset() or "utf-8"
                text_body = payload.decode(charset, errors="replace")
            elif ctype == "text/html" and not html_body:
                payload = part.get_payload(decode=True) or b""
                charset = part.get_content_charset() or "utf-8"
                html_body = payload.decode(charset, errors="replace")
    else:
        payload = msg.get_payload(decode=True) or b""
        charset = msg.get_content_charset() or "utf-8"
        decoded = payload.decode(charset, errors="replace")
        if msg.get_content_type() == "text/html":
            html_body = decoded
        else:
            text_body = decoded

    return {
        "text": text_body,
        "html": html_body,
        "attachments": attachments,
    }


def _summarize_message(uid: str, msg: email.message.Message) -> dict[str, Any]:
    """Small dict summarizing an email (used in lists)."""
    from_name, from_addr = parseaddr(msg.get("From", ""))
    date_raw = msg.get("Date", "")
    try:
        dt = parsedate_to_datetime(date_raw) if date_raw else None
        date_iso = dt.isoformat() if dt else ""
    except (TypeError, ValueError):
        date_iso = date_raw

    return {
        "uid": uid,
        "subject": _decode_header(msg.get("Subject")),
        "from_name": _decode_header(from_name),
        "from_address": from_addr,
        "to": _decode_header(msg.get("To", "")),
        "date": date_iso,
        "message_id": msg.get("Message-ID", ""),
    }


def _fetch_messages(conn: imaplib.IMAP4, uids: list[bytes], limit: int) -> list[dict[str, Any]]:
    """Fetch headers for a list of UIDs and return summaries (most recent first)."""
    uids = list(reversed(uids))[:limit]
    out: list[dict[str, Any]] = []
    for uid in uids:
        uid_str = uid.decode()
        status, data = conn.uid("fetch", uid_str, "(BODY.PEEK[HEADER])")
        if status != "OK" or not data or data[0] is None:
            continue
        raw_header = data[0][1] if isinstance(data[0], tuple) else b""
        msg = email.message_from_bytes(raw_header)
        out.append(_summarize_message(uid_str, msg))
    return out


def _select_folder(conn: imaplib.IMAP4, folder: str, readonly: bool = True) -> None:
    """SELECT a folder, quoting if it contains special chars."""
    status, _ = conn.select(f'"{folder}"', readonly=readonly)
    if status != "OK":
        raise RuntimeError(f'Could not select folder "{folder}"')


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------

@mcp.tool()
def list_folders() -> dict[str, Any]:
    """List all IMAP folders (mailboxes) available on the server.

    Useful to discover folder names like INBOX, Sent, Drafts, Trash,
    Junk, Archive, or any custom folders the user has created.
    """
    conn = _imap_connect()
    try:
        status, data = conn.list()
        folders = []
        if status == "OK" and data:
            for line in data:
                if not line:
                    continue
                try:
                    decoded = line.decode("utf-8", errors="replace")
                except AttributeError:
                    decoded = str(line)
                parts = decoded.rsplit(" ", 1)
                name = parts[-1].strip().strip('"')
                folders.append(name)
        return {"folders": folders, "count": len(folders)}
    finally:
        try:
            conn.logout()
        except Exception:
            pass


@mcp.tool()
def list_recent_messages(
    folder: str = "",
    limit: int = 20,
    unread_only: bool = False,
) -> dict[str, Any]:
    """List the most recent messages in a folder (headers only).

    Args:
        folder: Mailbox folder name (default: INBOX). Use list_folders() to discover.
        limit: Max number of messages to return. Max 100.
        unread_only: If true, only return messages flagged as UNSEEN.
    """
    folder = folder or DEFAULT_FOLDER
    limit = max(1, min(limit, 100))

    conn = _imap_connect()
    try:
        _select_folder(conn, folder, readonly=True)
        criterion = "UNSEEN" if unread_only else "ALL"
        status, data = conn.uid("search", None, criterion)
        if status != "OK":
            return {"folder": folder, "messages": [], "count": 0}
        uids = data[0].split() if data and data[0] else []
        messages = _fetch_messages(conn, uids, limit)
        return {
            "folder": folder,
            "messages": messages,
            "count": len(messages),
            "total_in_folder": len(uids),
        }
    finally:
        try:
            conn.close()
        except Exception:
            pass
        try:
            conn.logout()
        except Exception:
            pass


@mcp.tool()
def search_messages(
    folder: str = "",
    from_address: str = "",
    to_address: str = "",
    subject_contains: str = "",
    body_contains: str = "",
    since_days: int = 0,
    unread_only: bool = False,
    limit: int = 20,
) -> dict[str, Any]:
    """Search messages in a folder by header/body/date criteria.

    Any filter left empty is ignored. All supplied filters are ANDed together.

    Args:
        folder: Mailbox folder (default: INBOX).
        from_address: Match against the From header (substring).
        to_address: Match against the To header (substring).
        subject_contains: Match against Subject (substring).
        body_contains: Match against message body (substring). Slower than header search.
        since_days: Limit to messages newer than N days ago. 0 disables.
        unread_only: Only return UNSEEN messages.
        limit: Max results returned. Max 100.
    """
    folder = folder or DEFAULT_FOLDER
    limit = max(1, min(limit, 100))

    criteria: list[str] = []
    if unread_only:
        criteria.append("UNSEEN")
    if from_address:
        criteria.extend(["FROM", f'"{from_address}"'])
    if to_address:
        criteria.extend(["TO", f'"{to_address}"'])
    if subject_contains:
        criteria.extend(["SUBJECT", f'"{subject_contains}"'])
    if body_contains:
        criteria.extend(["BODY", f'"{body_contains}"'])
    if since_days > 0:
        date = (datetime.utcnow() - timedelta(days=since_days)).strftime("%d-%b-%Y")
        criteria.extend(["SINCE", date])
    if not criteria:
        criteria = ["ALL"]

    conn = _imap_connect()
    try:
        _select_folder(conn, folder, readonly=True)
        status, data = conn.uid("search", None, *criteria)
        if status != "OK":
            return {"folder": folder, "messages": [], "count": 0, "query": " ".join(criteria)}
        uids = data[0].split() if data and data[0] else []
        messages = _fetch_messages(conn, uids, limit)
        return {
            "folder": folder,
            "query": " ".join(criteria),
            "messages": messages,
            "count": len(messages),
            "total_matches": len(uids),
        }
    finally:
        try:
            conn.close()
        except Exception:
            pass
        try:
            conn.logout()
        except Exception:
            pass


@mcp.tool()
def read_message(uid: str, folder: str = "", mark_as_read: bool = False) -> dict[str, Any]:
    """Read the full content of a single message by UID.

    Args:
        uid: Message UID (from list_recent_messages or search_messages).
        folder: Mailbox folder containing the message (default: INBOX).
        mark_as_read: If true, mark the message as SEEN after reading.
                       Default false so reading is non-destructive.

    Returns headers, plain-text body, HTML body, and attachment metadata
    (filenames and sizes only - attachment content is not downloaded).
    """
    folder = folder or DEFAULT_FOLDER
    conn = _imap_connect()
    try:
        _select_folder(conn, folder, readonly=not mark_as_read)
        cmd = "(BODY[])" if mark_as_read else "(BODY.PEEK[])"
        status, data = conn.uid("fetch", uid, cmd)
        if status != "OK" or not data or data[0] is None:
            return {"error": f"Message {uid} not found in {folder}"}
        raw = data[0][1] if isinstance(data[0], tuple) else b""
        msg = email.message_from_bytes(raw)
        summary = _summarize_message(uid, msg)
        body = _extract_body(msg)
        return {
            **summary,
            "folder": folder,
            "body_text": body["text"],
            "body_html": body["html"],
            "attachments": body["attachments"],
        }
    finally:
        try:
            conn.close()
        except Exception:
            pass
        try:
            conn.logout()
        except Exception:
            pass


@mcp.tool()
def send_message(
    to: str,
    subject: str,
    body: str,
    cc: str = "",
    bcc: str = "",
    html: bool = False,
    reply_to_message_id: str = "",
) -> dict[str, Any]:
    """Send an email via SMTP from the configured account.

    Args:
        to: Recipient email address (or comma-separated list).
        subject: Email subject.
        body: Email body. Plain text by default; set html=true for HTML.
        cc: Optional CC recipients (comma-separated).
        bcc: Optional BCC recipients (comma-separated).
        html: If true, send body as HTML.
        reply_to_message_id: Optional Message-ID of a message being replied to.
    """
    msg = EmailMessage()
    msg["From"] = f"{MAIL_FROM_NAME} <{MAIL_USERNAME}>"
    msg["To"] = to
    if cc:
        msg["Cc"] = cc
    msg["Subject"] = subject
    if reply_to_message_id:
        msg["In-Reply-To"] = reply_to_message_id
        msg["References"] = reply_to_message_id

    if html:
        msg.set_content("This email requires an HTML-capable client.")
        msg.add_alternative(body, subtype="html")
    else:
        msg.set_content(body)

    recipients = [r.strip() for r in (to + "," + cc + "," + bcc).split(",") if r.strip()]

    context = ssl.create_default_context()
    if SMTP_USE_SSL and SMTP_PORT == 465:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context) as server:
            server.login(MAIL_USERNAME, MAIL_PASSWORD)
            server.send_message(msg, to_addrs=recipients)
    else:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            if SMTP_USE_SSL:
                server.starttls(context=context)
                server.ehlo()
            server.login(MAIL_USERNAME, MAIL_PASSWORD)
            server.send_message(msg, to_addrs=recipients)

    return {
        "status": "sent",
        "to": to,
        "cc": cc,
        "bcc": bcc,
        "subject": subject,
        "from": MAIL_USERNAME,
    }


@mcp.tool()
def mark_message(uid: str, folder: str = "", read: Optional[bool] = None, flagged: Optional[bool] = None) -> dict[str, Any]:
    """Mark a message as read/unread and/or flagged/unflagged.

    Args:
        uid: Message UID.
        folder: Mailbox folder (default: INBOX).
        read: True to mark SEEN, False to mark UNSEEN, None to skip.
        flagged: True to set Flagged, False to clear it, None to skip.
    """
    folder = folder or DEFAULT_FOLDER
    if read is None and flagged is None:
        return {"error": "Provide at least one of read or flagged."}

    conn = _imap_connect()
    try:
        _select_folder(conn, folder, readonly=False)
        if read is True:
            conn.uid("store", uid, "+FLAGS", "(\\Seen)")
        elif read is False:
            conn.uid("store", uid, "-FLAGS", "(\\Seen)")
        if flagged is True:
            conn.uid("store", uid, "+FLAGS", "(\\Flagged)")
        elif flagged is False:
            conn.uid("store", uid, "-FLAGS", "(\\Flagged)")
        return {"status": "ok", "uid": uid, "folder": folder, "read": read, "flagged": flagged}
    finally:
        try:
            conn.close()
        except Exception:
            pass
        try:
            conn.logout()
        except Exception:
            pass


@mcp.tool()
def move_message(uid: str, destination_folder: str, source_folder: str = "") -> dict[str, Any]:
    """Move a message from one folder to another.

    Useful to archive a message, or move to Trash (without permanent delete).
    Permanent deletion is intentionally not supported - move to Trash instead.

    Args:
        uid: Message UID to move.
        destination_folder: Target folder name (e.g. "Trash", "Archive").
        source_folder: Folder the message is currently in (default: INBOX).
    """
    source_folder = source_folder or DEFAULT_FOLDER

    conn = _imap_connect()
    try:
        _select_folder(conn, source_folder, readonly=False)
        try:
            status, _ = conn.uid("move", uid, f'"{destination_folder}"')
            if status == "OK":
                return {"status": "moved", "uid": uid, "from": source_folder, "to": destination_folder}
        except imaplib.IMAP4.error:
            pass

        status, _ = conn.uid("copy", uid, f'"{destination_folder}"')
        if status != "OK":
            return {"error": f"COPY to {destination_folder} failed."}
        conn.uid("store", uid, "+FLAGS", "(\\Deleted)")
        conn.expunge()
        return {
            "status": "moved",
            "uid": uid,
            "from": source_folder,
            "to": destination_folder,
            "note": "Used COPY+EXPUNGE fallback (server does not support MOVE).",
        }
    finally:
        try:
            conn.close()
        except Exception:
            pass
        try:
            conn.logout()
        except Exception:
            pass


@mcp.tool()
def get_account_info() -> dict[str, Any]:
    """Return info about the configured mailbox (for diagnostics)."""
    return {
        "username": MAIL_USERNAME,
        "from_name": MAIL_FROM_NAME,
        "imap_host": IMAP_HOST,
        "imap_port": IMAP_PORT,
        "imap_ssl": IMAP_USE_SSL,
        "smtp_host": SMTP_HOST,
        "smtp_port": SMTP_PORT,
        "smtp_ssl": SMTP_USE_SSL,
        "default_folder": DEFAULT_FOLDER,
    }


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    mcp.run()
