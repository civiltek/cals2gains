$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8765/")
$listener.Start()
while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    $filePath = "C:\Users\Judit\Downloads\macrolens" + ($request.Url.LocalPath -replace "/", "\")
    if (Test-Path $filePath) {
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        if ($filePath -match "\.png$") { $response.ContentType = "image/png" }
        elseif ($filePath -match "\.html$") { $response.ContentType = "text/html" }
        else { $response.ContentType = "application/octet-stream" }
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $response.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes("Not Found: $filePath")
        $response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $response.Close()
}