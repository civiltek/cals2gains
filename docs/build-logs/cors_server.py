from http.server import HTTPServer, SimpleHTTPRequestHandler
import os
os.chdir(r'C:\Users\Judit\Downloads\macrolens\instagram')
class CORSHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        super().end_headers()
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
HTTPServer(('localhost', 8083), CORSHandler).serve_forever()
