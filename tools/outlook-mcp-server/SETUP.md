# Outlook MCP Server — Guia de Configuracion

Servidor MCP para acceder al correo de Outlook/Microsoft 365 desde Claude,
usando Microsoft Graph API con autenticacion OAuth2.

**Cuenta:** info@civiltek.es

---

## Paso 1: Registrar la aplicacion en Azure Portal

1. Ve a [Azure Portal - App Registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Inicia sesion con la cuenta de administrador de tu organizacion (o con info@civiltek.es si tiene permisos de admin).
3. Haz clic en **"New registration"** (Nueva aplicacion).
4. Rellena los campos:
   - **Name:** `Outlook MCP Server - CivilTek`
   - **Supported account types:** Selecciona "Accounts in any organizational directory and personal Microsoft accounts"
   - **Redirect URI:**
     - Tipo: **Web**
     - URI: `http://localhost:3847/callback`
5. Haz clic en **"Register"**.
6. En la pagina de la aplicacion, copia el **Application (client) ID** — lo necesitaras como `OUTLOOK_CLIENT_ID`.

---

## Paso 2: Crear el Client Secret

1. En la pagina de tu aplicacion, ve a **"Certificates & secrets"** en el menu lateral.
2. Haz clic en **"New client secret"**.
3. Descripcion: `MCP Server Secret`
4. Duracion: **24 months** (maximo recomendado).
5. Haz clic en **"Add"**.
6. **IMPORTANTE:** Copia inmediatamente el **Value** del secreto (NO el Secret ID). Este es tu `OUTLOOK_CLIENT_SECRET`. Solo se muestra una vez.

---

## Paso 3: Configurar los permisos (API Permissions)

1. En la pagina de tu aplicacion, ve a **"API permissions"**.
2. Haz clic en **"Add a permission"**.
3. Selecciona **"Microsoft Graph"**.
4. Selecciona **"Delegated permissions"**.
5. Busca y selecciona estos permisos:
   - `Mail.Read`
   - `Mail.ReadBasic`
   - `User.Read`
   - `offline_access`
6. Haz clic en **"Add permissions"**.
7. (Opcional) Si eres admin, haz clic en **"Grant admin consent"** para aprobar los permisos para toda la organizacion.

---

## Paso 4: Instalar dependencias

Abre una terminal en la carpeta del servidor MCP y ejecuta:

```bash
cd outlook-mcp-server
pip install -r requirements.txt
```

O si prefieres usar un entorno virtual:

```bash
cd outlook-mcp-server
python -m venv venv
source venv/bin/activate       # En Windows: venv\Scripts\activate
pip install -r requirements.txt
```

---

## Paso 5: Autorizar la aplicacion y obtener el Refresh Token

1. Configura las variables de entorno con tu Client ID y Secret:

```bash
export OUTLOOK_CLIENT_ID="tu-client-id-aqui"
export OUTLOOK_CLIENT_SECRET="tu-client-secret-aqui"
```

En Windows (PowerShell):
```powershell
$env:OUTLOOK_CLIENT_ID = "tu-client-id-aqui"
$env:OUTLOOK_CLIENT_SECRET = "tu-client-secret-aqui"
```

2. Ejecuta el script de autorizacion:

```bash
python authorize.py
```

3. Se abrira el navegador. Inicia sesion con **info@civiltek.es**.
4. Acepta los permisos solicitados.
5. El script obtendra automaticamente el refresh token y creara un archivo `.env` en la carpeta del servidor.

---

## Paso 6: Verificar que funciona

Puedes probar el servidor manualmente:

```bash
python run_server.py
```

Si no hay errores, el servidor esta listo. Pulsa Ctrl+C para detenerlo.

---

## Paso 7: Configurar en Claude Desktop

Anade esta configuracion al archivo de Claude Desktop:

**Ubicacion del archivo de configuracion:**
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "outlook": {
      "command": "python",
      "args": ["/RUTA/COMPLETA/A/outlook-mcp-server/run_server.py"],
      "env": {
        "OUTLOOK_CLIENT_ID": "tu-client-id",
        "OUTLOOK_CLIENT_SECRET": "tu-client-secret",
        "OUTLOOK_REFRESH_TOKEN": "tu-refresh-token"
      }
    }
  }
}
```

**IMPORTANTE:** Reemplaza `/RUTA/COMPLETA/A/` con la ruta real donde guardaste la carpeta `outlook-mcp-server`.

Alternativamente, si el archivo `.env` esta en la carpeta del servidor, puedes omitir el bloque `env` y el servidor cargara las variables desde `.env` automaticamente.

---

## Paso 8 (Opcional): Configurar en Claude Code

Si usas Claude Code, anade al archivo `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "outlook": {
      "command": "python",
      "args": ["/RUTA/COMPLETA/A/outlook-mcp-server/run_server.py"]
    }
  }
}
```

---

## Herramientas disponibles

Una vez configurado, tendras estas herramientas en Claude:

| Herramienta | Descripcion |
|---|---|
| `outlook_search_emails` | Buscar emails por remitente, asunto, palabras clave, fechas, adjuntos |
| `outlook_read_email` | Leer el contenido completo de un email |
| `outlook_download_attachment` | Descargar adjuntos (PDFs de facturas, recibos, etc.) |
| `outlook_list_folders` | Listar carpetas del buzon |

### Ejemplos de uso en Claude

- "Busca los emails de facturas recibidos en marzo 2026"
- "Lee el ultimo email de proveedor@ejemplo.com"
- "Descarga el PDF adjunto de la factura de enero"
- "Lista las carpetas de correo de Outlook"

---

## Solucion de problemas

**Error: Authentication failed / Token expired**
El refresh token puede caducar si no se usa durante 90 dias o si se revocan los permisos. Ejecuta `python authorize.py` de nuevo.

**Error: Permission denied**
Verifica que los permisos `Mail.Read` estan concedidos en Azure Portal y que se ha dado consentimiento de admin si es necesario.

**Error: Missing environment variables**
Asegurate de que el archivo `.env` existe en la carpeta del servidor con las tres variables: `OUTLOOK_CLIENT_ID`, `OUTLOOK_CLIENT_SECRET`, `OUTLOOK_REFRESH_TOKEN`.

**El navegador no se abre durante la autorizacion**
Copia la URL que aparece en la terminal y pegala manualmente en el navegador.
