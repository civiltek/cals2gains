Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class D {
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@
[D]::SetProcessDPIAware()
# Bring Chrome to front one more time
$chrome = Get-Process -Id 13028
[D]::SetForegroundWindow($chrome.MainWindowHandle)
Start-Sleep -Milliseconds 800

$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen(0, 0, 0, 0, $bounds.Size)
$bmp.Save("C:\Users\Judit\Documents\Cals2Gains\instagram\screenshots\full_screen.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Output "OK $($bounds.Width)x$($bounds.Height)"
