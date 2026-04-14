#!/usr/bin/env python3
"""
Launcher for the Outlook MCP Server.
Loads .env variables before starting the server.
"""

import os
import sys

# Load .env file from the same directory as this script
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, ".env")

if os.path.exists(env_path):
    from dotenv import load_dotenv
    load_dotenv(env_path)
else:
    print(f"[WARNING] No .env file found at {env_path}", file=sys.stderr)
    print("  Run authorize.py first to set up authentication.", file=sys.stderr)

# Now import and run the server
from server import mcp

if __name__ == "__main__":
    mcp.run()
