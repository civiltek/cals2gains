# telegram-mcp-server

MCP server que usa Telegram como canal de aprobación humano para el pipeline
de contenido de Cals2Gains. Claude envía un borrador (imagen + caption +
hashtags + botones Aprobar/Cambios/Descartar) al chat de Judith, y el pipeline
espera su decisión antes de seguir.

Bot: **@cals2gains_approvals_bot**
Destino en disco: `C:\Users\Judit\Documents\Cals2Gains\tools\telegram-mcp-server\`

## Tools expuestas

| Tool | Qué hace |
|---|---|
| `send_draft(title, caption, hashtags, draft_id, image_path=None)` | Manda un draft con botones inline. Devuelve `{draft_id, message_id, chat_id, status}`. |
| `send_text(text)` | Manda una notificación de texto plano. |
| `poll_replies(since=None)` | Devuelve respuestas pendientes normalizadas: `[{draft_id, action, payload, timestamp}]` donde `action ∈ {approve, changes, discard, text}`. |
| `wait_for_reply(draft_id, timeout_seconds=3600)` | Bloquea hasta que llegue Aprobar/Cambios/Descartar para ese draft. Acumula comentarios de texto como `feedback`. |

## Seguridad

- El `.env` está en `.gitignore` — nunca se comitea el token.
- El server ignora mensajes cuyo `chat.id` no coincide con `TELEGRAM_CHAT_ID`.
- El logging (archivo rotativo `telegram-mcp.log`) nunca imprime el token ni URLs con token.
- `drafts.json` contiene solo títulos/captions/estados, no credenciales.

## Setup (en el PC de Judith — Windows)

### 1. Crear el bot con @BotFather (**ya hecho**)

Ya tienes el bot creado: `@cals2gains_approvals_bot`. Token ya inyectado en
`.env`. Si alguna vez tienes que regenerarlo:

1. Habla con `@BotFather` en Telegram.
2. `/mybots` → elegir `cals2gains_approvals_bot` → **API Token**.
3. Copia el token nuevo a `TELEGRAM_BOT_TOKEN` en `.env`.

### 2. Arrancar una conversación con el bot

En Telegram, busca **@cals2gains_approvals_bot**, abre el chat y pulsa
**Start** (o envía `/start`). Esto es imprescindible — hasta que lo hagas,
el bot no puede escribirte.

### 3. Instalar dependencias y detectar el chat_id

En PowerShell, desde la carpeta del server:

```powershell
cd C:\Users\Judit\Documents\Cals2Gains\tools\telegram-mcp-server
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Tras haber hecho /start en Telegram:
python test_connection.py
```

El script:
1. Llama a `getUpdates`, detecta el `chat_id` del `/start` y lo escribe
   automáticamente en `.env` (`TELEGRAM_CHAT_ID=...`).
2. Envía un mensaje de prueba: *"✅ Bot conectado correctamente desde el MCP
   de Cals2Gains. Responde con 'ok' para confirmar"*.

Para verificar el camino de vuelta (respuestas), contesta `ok` en Telegram
y vuelve a correr:

```powershell
python test_connection.py --check-reply
```

### 4. Registrar el MCP en Claude Cowork

Cowork lee su config de MCPs típicamente en:

```
%APPDATA%\Claude\claude_desktop_config.json
```

(equivalente a `C:\Users\Judit\AppData\Roaming\Claude\claude_desktop_config.json`).

Añade el server al objeto `mcpServers`:

```json
{
  "mcpServers": {
    "telegram-approval": {
      "command": "C:\\Users\\Judit\\Documents\\Cals2Gains\\tools\\telegram-mcp-server\\.venv\\Scripts\\python.exe",
      "args": ["C:\\Users\\Judit\\Documents\\Cals2Gains\\tools\\telegram-mcp-server\\server.py"],
      "env": {}
    }
  }
}
```

Si ya tienes otros MCPs declarados (los `imap-*`), añade esta entrada junto
a ellos — no reemplaces el bloque.

Reinicia Claude Cowork. Deberías ver las tools `send_draft`, `send_text`,
`poll_replies`, `wait_for_reply` disponibles.

### 5. Arranque manual (debug)

No hace falta para el uso normal, pero si quieres ejecutar el server a mano:

```powershell
cd C:\Users\Judit\Documents\Cals2Gains\tools\telegram-mcp-server
.\.venv\Scripts\Activate.ps1
python server.py
```

El server usa transporte **stdio** — se quedará esperando input y lo
consumirá Cowork directamente cuando lo lance.

## Archivos

```
telegram-mcp-server/
├── server.py              # MCP server (4 tools)
├── telegram_client.py     # wrapper httpx de la Bot API
├── draft_store.py         # persistencia en drafts.json
├── test_connection.py     # setup + smoke test
├── requirements.txt
├── README.md
├── .env.example
├── .env                   # (con el token real, NO comitear)
├── .gitignore
├── drafts.json            # (se crea al primer send_draft)
└── telegram-mcp.log       # (rotativo, se crea al arrancar)
```

## Formato de respuestas

- **Botón `Aprobar`** → `{action: "approve", draft_id, ...}`
- **Botón `Cambios`** → `{action: "changes", draft_id, ...}` — el siguiente
  mensaje de texto del reviewer se considera feedback
- **Botón `Descartar`** → `{action: "discard", draft_id, ...}`
- **Texto libre con prefijo `<draft_id>: <feedback>`** → `{action: "text", draft_id, payload, ...}`
- **Texto libre sin prefijo** → `{action: "text", draft_id: null, payload, ...}`
