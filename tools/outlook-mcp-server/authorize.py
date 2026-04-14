#!/usr/bin/env python3
"""
OAuth2 Authorization Helper for Outlook MCP Server.

This script performs the OAuth2 authorization code flow to obtain
a refresh token for the Outlook MCP server.

Usage:
    1. Set OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET as environment variables
       (or edit the values below).
    2. Run: python authorize.py
    3. A browser window will open for you to sign in with your Microsoft account.
    4. After consent, you'll be redirected to localhost — the script captures the code.
    5. The refresh token is printed and saved to .env file.

Account: info@civiltek.es
"""

import os
import sys
import json
import webbrowser
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
import requests  # using sync requests for simplicity in this helper

# ── Configuration ───────────────────────────────────────────────────────────

CLIENT_ID = os.environ.get("OUTLOOK_CLIENT_ID", "YOUR_CLIENT_ID_HERE")
CLIENT_SECRET = os.environ.get("OUTLOOK_CLIENT_SECRET", "YOUR_CLIENT_SECRET_HERE")
REDIRECT_URI = "http://localhost:3847/callback"
SCOPES = "offline_access Mail.Read Mail.ReadBasic User.Read"
AUTHORITY = "https://login.microsoftonline.com/common"
AUTHORIZE_URL = f"{AUTHORITY}/oauth2/v2.0/authorize"
TOKEN_URL = f"{AUTHORITY}/oauth2/v2.0/token"

# ── OAuth2 callback handler ────────────────────────────────────────────────

captured_code = None


class CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global captured_code
        query = urllib.parse.urlparse(self.path).query
        params = urllib.parse.parse_qs(query)

        if "code" in params:
            captured_code = params["code"][0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(
                b"<html><body><h2>Authorization successful!</h2>"
                b"<p>You can close this tab and return to the terminal.</p>"
                b"</body></html>"
            )
        elif "error" in params:
            error = params.get("error", ["unknown"])[0]
            desc = params.get("error_description", [""])[0]
            self.send_response(400)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(
                f"<html><body><h2>Authorization failed</h2>"
                f"<p>Error: {error}</p><p>{desc}</p></body></html>".encode()
            )
            print(f"\n[ERROR] Authorization failed: {error} — {desc}", file=sys.stderr)
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass  # Suppress default logging


# ── Main flow ───────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  Outlook MCP — OAuth2 Authorization")
    print("=" * 60)

    if CLIENT_ID == "YOUR_CLIENT_ID_HERE":
        print("\n[!] Please set OUTLOOK_CLIENT_ID first.")
        print("    Export it as an environment variable or edit this script.")
        sys.exit(1)

    if CLIENT_SECRET == "YOUR_CLIENT_SECRET_HERE":
        print("\n[!] Please set OUTLOOK_CLIENT_SECRET first.")
        sys.exit(1)

    # Step 1: Build authorization URL
    auth_params = {
        "client_id": CLIENT_ID,
        "response_type": "code",
        "redirect_uri": REDIRECT_URI,
        "response_mode": "query",
        "scope": SCOPES,
        "login_hint": "info@civiltek.es",
    }
    auth_url = f"{AUTHORIZE_URL}?{urllib.parse.urlencode(auth_params)}"

    print(f"\n1. Opening browser for authorization...")
    print(f"   Sign in with: info@civiltek.es")
    print(f"\n   If the browser doesn't open, visit this URL manually:")
    print(f"   {auth_url}\n")

    webbrowser.open(auth_url)

    # Step 2: Start local server to capture callback
    print("2. Waiting for authorization callback on port 3847...")
    server = HTTPServer(("127.0.0.1", 3847), CallbackHandler)
    server.handle_request()  # Handle one request only

    if not captured_code:
        print("\n[ERROR] No authorization code received. Please try again.")
        sys.exit(1)

    print("\n3. Authorization code received. Exchanging for tokens...")

    # Step 3: Exchange code for tokens
    token_data = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "code": captured_code,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code",
        "scope": SCOPES,
    }

    try:
        resp = requests.post(TOKEN_URL, data=token_data, timeout=30)
        resp.raise_for_status()
        tokens = resp.json()
    except Exception as e:
        print(f"\n[ERROR] Token exchange failed: {e}")
        if hasattr(e, "response") and e.response is not None:
            print(f"  Response: {e.response.text[:500]}")
        sys.exit(1)

    refresh_token = tokens.get("refresh_token")
    access_token = tokens.get("access_token")

    if not refresh_token:
        print("\n[ERROR] No refresh token in response. Ensure 'offline_access' scope is requested.")
        print(f"  Response: {json.dumps(tokens, indent=2)}")
        sys.exit(1)

    # Step 4: Verify by fetching profile
    print("\n4. Verifying access...")
    try:
        profile_resp = requests.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        profile = profile_resp.json()
        print(f"   Authenticated as: {profile.get('displayName', '?')} ({profile.get('mail', profile.get('userPrincipalName', '?'))})")
    except Exception:
        print("   (Could not verify profile, but tokens were obtained)")

    # Step 5: Save to .env file
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    with open(env_path, "w") as f:
        f.write(f"OUTLOOK_CLIENT_ID={CLIENT_ID}\n")
        f.write(f"OUTLOOK_CLIENT_SECRET={CLIENT_SECRET}\n")
        f.write(f"OUTLOOK_REFRESH_TOKEN={refresh_token}\n")

    print(f"\n{'=' * 60}")
    print("  SUCCESS!")
    print(f"{'=' * 60}")
    print(f"\n  Tokens saved to: {env_path}")
    print(f"\n  Refresh Token (first 20 chars): {refresh_token[:20]}...")
    print(f"\n  Next steps:")
    print(f"  1. The .env file has been created in the server directory.")
    print(f"  2. Configure Claude Desktop to use this MCP server.")
    print(f"     See SETUP.md for the Claude Desktop configuration.\n")


if __name__ == "__main__":
    main()
