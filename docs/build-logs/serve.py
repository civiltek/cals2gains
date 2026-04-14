import http.server, socketserver, threading
PORT = 8765
handler = http.server.SimpleHTTPRequestHandler
handler.directory = r'C:\Users\Judit\Downloads\macrolens'
with socketserver.TCPServer(('127.0.0.1', PORT), handler) as httpd:
    httpd.serve_forever()