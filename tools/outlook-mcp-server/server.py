#!/usr/bin/env python3
"""
MCP Server for Microsoft Outlook / Microsoft 365 via Microsoft Graph API.

Provides tools to search, read, and download emails and attachments
from Outlook mailboxes using OAuth2 authentication with refresh tokens.

Account: info@civiltek.es
"""

import json
import os
import base64
from typing import Optional, List
from enum import Enum
from datetime import datetime

import httpx
from pydantic import BaseModel, Field, field_validator, ConfigDict
from mcp.server.fastmcp import FastMCP

# ── Initialize MCP server ──────────────────────────────────────────────────
mcp = FastMCP("outlook_mcp")

# ── Constants ───────────────────────────────────────────────────────────────
GRAPH_API_BASE = "https://graph.microsoft.com/v1.0"
TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
SCOPES = "offline_access Mail.Read Mail.ReadBasic User.Read"

# ── Auth helpers ────────────────────────────────────────────────────────────

_cached_token: dict = {}


async def _get_access_token() -> str:
    """Get a valid access token, refreshing if needed."""
    global _cached_token

    client_id = os.environ.get("OUTLOOK_CLIENT_ID", "")
    client_secret = os.environ.get("OUTLOOK_CLIENT_SECRET", "")
    refresh_token = os.environ.get("OUTLOOK_REFRESH_TOKEN", "")

    if not all([client_id, client_secret, refresh_token]):
        raise ValueError(
            "Missing environment variables. Please set OUTLOOK_CLIENT_ID, "
            "OUTLOOK_CLIENT_SECRET, and OUTLOOK_REFRESH_TOKEN. "
            "See SETUP.md for instructions."
        )

    # Check if we have a cached token that's still valid
    if _cached_token.get("access_token") and _cached_token.get("expires_at", 0) > datetime.now().timestamp() + 60:
        return _cached_token["access_token"]

    # Refresh the token
    async with httpx.AsyncClient() as client:
        response = await client.post(
            TOKEN_URL,
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
                "scope": SCOPES,
            },
            timeout=30.0,
        )
        response.raise_for_status()
        data = response.json()

    _cached_token = {
        "access_token": data["access_token"],
        "expires_at": datetime.now().timestamp() + data.get("expires_in", 3600),
    }

    # If a new refresh_token was issued, log it so the user can update .env
    if "refresh_token" in data and data["refresh_token"] != refresh_token:
        import sys
        print(
            f"[outlook_mcp] New refresh token issued. Update OUTLOOK_REFRESH_TOKEN in your .env:\n"
            f"{data['refresh_token']}",
            file=sys.stderr,
        )

    return _cached_token["access_token"]


# ── Shared API client ───────────────────────────────────────────────────────

async def _graph_request(
    endpoint: str,
    method: str = "GET",
    params: Optional[dict] = None,
    **kwargs,
) -> dict:
    """Make an authenticated request to Microsoft Graph API."""
    token = await _get_access_token()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    async with httpx.AsyncClient() as client:
        response = await client.request(
            method,
            f"{GRAPH_API_BASE}/{endpoint}",
            headers=headers,
            params=params,
            timeout=30.0,
            **kwargs,
        )
        response.raise_for_status()
        return response.json()


async def _graph_request_raw(endpoint: str) -> bytes:
    """Make an authenticated request that returns raw bytes (for attachments)."""
    token = await _get_access_token()
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{GRAPH_API_BASE}/{endpoint}",
            headers=headers,
            timeout=60.0,
        )
        response.raise_for_status()
        return response.content


def _handle_graph_error(e: Exception) -> str:
    """Consistent error formatting for Graph API errors."""
    if isinstance(e, httpx.HTTPStatusError):
        status = e.response.status_code
        try:
            detail = e.response.json().get("error", {}).get("message", "")
        except Exception:
            detail = e.response.text[:200]

        if status == 401:
            return (
                "Error: Authentication failed. Your refresh token may have expired. "
                "Run the authorization script again (see SETUP.md)."
            )
        elif status == 403:
            return "Error: Permission denied. Ensure the app has Mail.Read scope."
        elif status == 404:
            return "Error: Resource not found. Check the message ID or folder ID."
        elif status == 429:
            return "Error: Rate limit exceeded. Wait a moment and try again."
        return f"Error: Graph API returned {status}. {detail}"
    elif isinstance(e, httpx.TimeoutException):
        return "Error: Request timed out. Try again or use a narrower search."
    elif isinstance(e, ValueError):
        return f"Error: Configuration issue — {e}"
    return f"Error: {type(e).__name__}: {e}"


# ── Formatting helpers ──────────────────────────────────────────────────────

def _format_email_summary(msg: dict) -> str:
    """Format a single email into a readable summary."""
    sender = msg.get("from", {}).get("emailAddress", {})
    sender_str = f"{sender.get('name', 'Unknown')} <{sender.get('address', '')}>"
    date = msg.get("receivedDateTime", "")[:19].replace("T", " ")
    has_attach = " [+attachments]" if msg.get("hasAttachments") else ""
    read = "" if msg.get("isRead") else " [UNREAD]"

    return (
        f"**{msg.get('subject', '(no subject)')}**{read}{has_attach}\n"
        f"  From: {sender_str}\n"
        f"  Date: {date}\n"
        f"  ID: `{msg.get('id', '')}`"
    )


def _format_date_filter(date_from: Optional[str], date_to: Optional[str]) -> str:
    """Build an OData filter string for date range."""
    parts = []
    if date_from:
        parts.append(f"receivedDateTime ge {date_from}T00:00:00Z")
    if date_to:
        parts.append(f"receivedDateTime le {date_to}T23:59:59Z")
    return " and ".join(parts)


# ── Enums ───────────────────────────────────────────────────────────────────

class ResponseFormat(str, Enum):
    MARKDOWN = "markdown"
    JSON = "json"


# ── Input Models ────────────────────────────────────────────────────────────

class SearchEmailsInput(BaseModel):
    """Input for searching emails in Outlook."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    query: Optional[str] = Field(
        default=None,
        description=(
            "Free-text search query. Searches subject, body, and sender. "
            "Example: 'factura enero' or 'from:proveedor@ejemplo.com'"
        ),
        max_length=500,
    )
    sender: Optional[str] = Field(
        default=None,
        description="Filter by sender email address (e.g., 'facturas@proveedor.com')",
    )
    subject: Optional[str] = Field(
        default=None,
        description="Filter by subject containing this text (e.g., 'Factura')",
    )
    date_from: Optional[str] = Field(
        default=None,
        description="Start date in YYYY-MM-DD format (e.g., '2026-01-01')",
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    )
    date_to: Optional[str] = Field(
        default=None,
        description="End date in YYYY-MM-DD format (e.g., '2026-03-31')",
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    )
    folder_id: Optional[str] = Field(
        default=None,
        description="Folder ID to search in. Use 'inbox', 'sentitems', 'drafts', or a folder ID from outlook_list_folders.",
    )
    has_attachments: Optional[bool] = Field(
        default=None,
        description="Filter to only emails with attachments (useful for finding invoices/receipts).",
    )
    limit: int = Field(
        default=20,
        description="Maximum number of results to return.",
        ge=1,
        le=100,
    )
    offset: int = Field(
        default=0,
        description="Number of results to skip (for pagination).",
        ge=0,
    )
    response_format: ResponseFormat = Field(
        default=ResponseFormat.MARKDOWN,
        description="Output format: 'markdown' for readable or 'json' for structured data.",
    )


class ReadEmailInput(BaseModel):
    """Input for reading a single email."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    message_id: str = Field(
        ...,
        description="The email message ID (obtained from outlook_search_emails).",
        min_length=1,
    )
    include_body: bool = Field(
        default=True,
        description="Whether to include the full email body.",
    )
    body_format: str = Field(
        default="text",
        description="Body format: 'text' for plain text (recommended) or 'html' for HTML.",
        pattern=r"^(text|html)$",
    )
    response_format: ResponseFormat = Field(
        default=ResponseFormat.MARKDOWN,
        description="Output format: 'markdown' or 'json'.",
    )


class DownloadAttachmentInput(BaseModel):
    """Input for downloading an email attachment."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    message_id: str = Field(
        ...,
        description="The email message ID that contains the attachment.",
        min_length=1,
    )
    attachment_id: Optional[str] = Field(
        default=None,
        description=(
            "Specific attachment ID to download. If omitted, lists all attachments. "
            "Get attachment IDs from outlook_read_email."
        ),
    )
    save_path: Optional[str] = Field(
        default=None,
        description=(
            "Directory path where to save the file. "
            "Defaults to current directory. Example: '/tmp/invoices'"
        ),
    )


class ListFoldersInput(BaseModel):
    """Input for listing mail folders."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    parent_folder_id: Optional[str] = Field(
        default=None,
        description="Parent folder ID to list subfolders of. Omit to list top-level folders.",
    )
    response_format: ResponseFormat = Field(
        default=ResponseFormat.MARKDOWN,
        description="Output format: 'markdown' or 'json'.",
    )


# ── Tools ───────────────────────────────────────────────────────────────────

@mcp.tool(
    name="outlook_search_emails",
    annotations={
        "title": "Search Outlook Emails",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    },
)
async def outlook_search_emails(params: SearchEmailsInput) -> str:
    """Search emails in Outlook by sender, subject, keywords, date range, or attachments.

    Use this tool to find emails matching specific criteria. Supports free-text search,
    filtering by sender address, subject keywords, date ranges, and attachment presence.
    Results include message IDs needed for outlook_read_email and outlook_download_attachment.

    Args:
        params (SearchEmailsInput): Search parameters including:
            - query (Optional[str]): Free-text search across subject/body/sender
            - sender (Optional[str]): Filter by sender email address
            - subject (Optional[str]): Filter by subject text
            - date_from (Optional[str]): Start date YYYY-MM-DD
            - date_to (Optional[str]): End date YYYY-MM-DD
            - folder_id (Optional[str]): Folder to search in
            - has_attachments (Optional[bool]): Only emails with attachments
            - limit (int): Max results (1-100, default 20)
            - offset (int): Skip N results for pagination
            - response_format: 'markdown' or 'json'

    Returns:
        str: List of matching emails with subject, sender, date, and message ID.
    """
    try:
        # Build the request based on whether we use $search or $filter
        select_fields = "id,subject,from,receivedDateTime,hasAttachments,isRead,bodyPreview"
        folder = params.folder_id or "inbox"
        endpoint = f"me/mailFolders/{folder}/messages"

        query_params: dict = {
            "$select": select_fields,
            "$top": params.limit,
            "$skip": params.offset,
            "$orderby": "receivedDateTime desc",
        }

        # Build OData $filter
        filters = []
        if params.sender:
            filters.append(f"from/emailAddress/address eq '{params.sender}'")
        if params.subject:
            filters.append(f"contains(subject, '{params.subject}')")
        if params.has_attachments is not None:
            filters.append(f"hasAttachments eq {str(params.has_attachments).lower()}")

        date_filter = _format_date_filter(params.date_from, params.date_to)
        if date_filter:
            filters.append(date_filter)

        if filters:
            query_params["$filter"] = " and ".join(filters)

        # If free-text query is provided, use $search (cannot combine with $filter on same request)
        if params.query and not filters:
            query_params["$search"] = f'"{params.query}"'
            # $search doesn't support $orderby
            query_params.pop("$orderby", None)
        elif params.query and filters:
            # When combining with filters, add subject/body contains as filter
            filters.append(f"contains(subject, '{params.query}') or contains(bodyPreview, '{params.query}')")
            query_params["$filter"] = " and ".join(filters)

        data = await _graph_request(endpoint, params=query_params)
        messages = data.get("value", [])

        if not messages:
            return "No emails found matching your criteria."

        has_more = "@odata.nextLink" in data
        total_text = f"Showing {len(messages)} results" + (" (more available — increase offset)" if has_more else "")

        if params.response_format == ResponseFormat.JSON:
            return json.dumps(
                {
                    "count": len(messages),
                    "offset": params.offset,
                    "has_more": has_more,
                    "messages": [
                        {
                            "id": m["id"],
                            "subject": m.get("subject", ""),
                            "from": m.get("from", {}).get("emailAddress", {}),
                            "receivedDateTime": m.get("receivedDateTime", ""),
                            "hasAttachments": m.get("hasAttachments", False),
                            "isRead": m.get("isRead", True),
                            "bodyPreview": m.get("bodyPreview", "")[:200],
                        }
                        for m in messages
                    ],
                },
                indent=2,
                ensure_ascii=False,
            )

        # Markdown format
        lines = [f"# Outlook Search Results\n", total_text, ""]
        for msg in messages:
            lines.append(_format_email_summary(msg))
            preview = msg.get("bodyPreview", "")[:150]
            if preview:
                lines.append(f"  Preview: {preview}...")
            lines.append("")

        return "\n".join(lines)

    except Exception as e:
        return _handle_graph_error(e)


@mcp.tool(
    name="outlook_read_email",
    annotations={
        "title": "Read Outlook Email",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    },
)
async def outlook_read_email(params: ReadEmailInput) -> str:
    """Read the full content of a specific email by its message ID.

    Retrieves the complete email including headers, body, and attachment list.
    Use message IDs from outlook_search_emails results.

    Args:
        params (ReadEmailInput): Parameters including:
            - message_id (str): Email message ID from search results
            - include_body (bool): Include full body text (default True)
            - body_format (str): 'text' or 'html' (default 'text')
            - response_format: 'markdown' or 'json'

    Returns:
        str: Full email content with headers, body, and attachment list.
    """
    try:
        prefer_header = f'outlook.body-content-type="{params.body_format}"'
        endpoint = f"me/messages/{params.message_id}"
        select = "id,subject,from,toRecipients,ccRecipients,receivedDateTime,body,hasAttachments,importance,isRead"

        token = await _get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Prefer": prefer_header,
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{GRAPH_API_BASE}/{endpoint}",
                headers=headers,
                params={"$select": select},
                timeout=30.0,
            )
            response.raise_for_status()
            msg = response.json()

        # Get attachments list if any
        attachments = []
        if msg.get("hasAttachments"):
            att_data = await _graph_request(f"me/messages/{params.message_id}/attachments", params={"$select": "id,name,contentType,size"})
            attachments = att_data.get("value", [])

        if params.response_format == ResponseFormat.JSON:
            result = {
                "id": msg["id"],
                "subject": msg.get("subject", ""),
                "from": msg.get("from", {}).get("emailAddress", {}),
                "to": [r.get("emailAddress", {}) for r in msg.get("toRecipients", [])],
                "cc": [r.get("emailAddress", {}) for r in msg.get("ccRecipients", [])],
                "receivedDateTime": msg.get("receivedDateTime", ""),
                "importance": msg.get("importance", "normal"),
                "isRead": msg.get("isRead", True),
                "body": msg.get("body", {}).get("content", "") if params.include_body else "(omitted)",
                "attachments": [
                    {"id": a["id"], "name": a["name"], "contentType": a.get("contentType", ""), "size": a.get("size", 0)}
                    for a in attachments
                ],
            }
            return json.dumps(result, indent=2, ensure_ascii=False)

        # Markdown format
        sender = msg.get("from", {}).get("emailAddress", {})
        to_list = ", ".join(
            f"{r.get('emailAddress', {}).get('name', '')} <{r.get('emailAddress', {}).get('address', '')}>"
            for r in msg.get("toRecipients", [])
        )
        cc_list = ", ".join(
            f"{r.get('emailAddress', {}).get('name', '')} <{r.get('emailAddress', {}).get('address', '')}>"
            for r in msg.get("ccRecipients", [])
        )
        date = msg.get("receivedDateTime", "")[:19].replace("T", " ")

        lines = [
            f"# {msg.get('subject', '(no subject)')}",
            "",
            f"**From:** {sender.get('name', '')} <{sender.get('address', '')}>",
            f"**To:** {to_list}",
        ]
        if cc_list:
            lines.append(f"**CC:** {cc_list}")
        lines.extend([
            f"**Date:** {date}",
            f"**Importance:** {msg.get('importance', 'normal')}",
            "",
        ])

        if attachments:
            lines.append("## Attachments")
            for a in attachments:
                size_kb = a.get("size", 0) / 1024
                lines.append(f"- **{a['name']}** ({size_kb:.1f} KB) — ID: `{a['id']}`")
            lines.append("")

        if params.include_body:
            lines.append("## Body")
            lines.append("")
            lines.append(msg.get("body", {}).get("content", "(empty)"))

        return "\n".join(lines)

    except Exception as e:
        return _handle_graph_error(e)


@mcp.tool(
    name="outlook_download_attachment",
    annotations={
        "title": "Download Email Attachment",
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    },
)
async def outlook_download_attachment(params: DownloadAttachmentInput) -> str:
    """Download attachments from an email. Lists attachments if no attachment_id is given.

    Use this to download PDF invoices, receipts, or other files attached to emails.
    First call without attachment_id to list available attachments, then call with
    a specific attachment_id to download.

    Args:
        params (DownloadAttachmentInput): Parameters including:
            - message_id (str): Email message ID
            - attachment_id (Optional[str]): Specific attachment to download
            - save_path (Optional[str]): Directory to save file to

    Returns:
        str: If no attachment_id: list of attachments. If attachment_id given: file path of saved file.
    """
    try:
        # If no attachment_id, list all attachments
        if not params.attachment_id:
            data = await _graph_request(
                f"me/messages/{params.message_id}/attachments",
                params={"$select": "id,name,contentType,size"},
            )
            attachments = data.get("value", [])
            if not attachments:
                return "This email has no attachments."

            lines = ["# Attachments\n"]
            for a in attachments:
                size_kb = a.get("size", 0) / 1024
                lines.append(f"- **{a['name']}** ({size_kb:.1f} KB, {a.get('contentType', 'unknown')})")
                lines.append(f"  ID: `{a['id']}`")
            lines.append("\nUse the attachment ID with outlook_download_attachment to download a specific file.")
            return "\n".join(lines)

        # Download specific attachment
        data = await _graph_request(
            f"me/messages/{params.message_id}/attachments/{params.attachment_id}"
        )

        filename = data.get("name", "attachment")
        content_bytes = base64.b64decode(data.get("contentBytes", ""))

        save_dir = params.save_path or os.getcwd()
        os.makedirs(save_dir, exist_ok=True)
        filepath = os.path.join(save_dir, filename)

        # Avoid overwriting
        if os.path.exists(filepath):
            name, ext = os.path.splitext(filename)
            counter = 1
            while os.path.exists(filepath):
                filepath = os.path.join(save_dir, f"{name}_{counter}{ext}")
                counter += 1

        with open(filepath, "wb") as f:
            f.write(content_bytes)

        size_kb = len(content_bytes) / 1024
        return (
            f"Attachment downloaded successfully.\n\n"
            f"**File:** {os.path.basename(filepath)}\n"
            f"**Size:** {size_kb:.1f} KB\n"
            f"**Path:** {filepath}"
        )

    except Exception as e:
        return _handle_graph_error(e)


@mcp.tool(
    name="outlook_list_folders",
    annotations={
        "title": "List Outlook Mail Folders",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    },
)
async def outlook_list_folders(params: ListFoldersInput) -> str:
    """List mail folders in the Outlook mailbox.

    Returns folder names, IDs, and unread counts. Use folder IDs with
    outlook_search_emails to search within specific folders.

    Args:
        params (ListFoldersInput): Parameters including:
            - parent_folder_id (Optional[str]): List subfolders of this folder
            - response_format: 'markdown' or 'json'

    Returns:
        str: List of folders with names, IDs, and message counts.
    """
    try:
        if params.parent_folder_id:
            endpoint = f"me/mailFolders/{params.parent_folder_id}/childFolders"
        else:
            endpoint = "me/mailFolders"

        data = await _graph_request(
            endpoint,
            params={
                "$select": "id,displayName,totalItemCount,unreadItemCount,childFolderCount",
                "$top": 50,
            },
        )
        folders = data.get("value", [])

        if not folders:
            return "No folders found."

        if params.response_format == ResponseFormat.JSON:
            return json.dumps(
                {
                    "count": len(folders),
                    "folders": [
                        {
                            "id": f["id"],
                            "displayName": f.get("displayName", ""),
                            "totalItemCount": f.get("totalItemCount", 0),
                            "unreadItemCount": f.get("unreadItemCount", 0),
                            "childFolderCount": f.get("childFolderCount", 0),
                        }
                        for f in folders
                    ],
                },
                indent=2,
                ensure_ascii=False,
            )

        lines = ["# Mail Folders\n"]
        for f in folders:
            unread = f.get("unreadItemCount", 0)
            total = f.get("totalItemCount", 0)
            children = f.get("childFolderCount", 0)
            unread_badge = f" ({unread} unread)" if unread else ""
            children_badge = f" [{children} subfolders]" if children else ""

            lines.append(f"- **{f.get('displayName', '?')}** — {total} messages{unread_badge}{children_badge}")
            lines.append(f"  ID: `{f['id']}`")

        return "\n".join(lines)

    except Exception as e:
        return _handle_graph_error(e)


# ── Entry point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    mcp.run()
