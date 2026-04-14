Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class D2 {
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
}
"@
[D2]::SetProcessDPIAware()

$chrome = Get-Process -Id 13028
$hWnd = $chrome.MainWindowHandle
[D2]::SetForegroundWindow($hWnd)
Start-Sleep -Milliseconds 500

# Get window rect in physical pixels (DPI-aware)
$rect = New-Object D2+RECT
[D2]::GetWindowRect($hWnd, [ref]$rect)
$ww = $rect.Right - $rect.Left
$wh = $rect.Bottom - $rect.Top
Write-Output "Chrome physical rect: L=$($rect.Left) T=$($rect.Top) R=$($rect.Right) B=$($rect.Bottom) Size=${ww}x${wh}"

# Capture just the Chrome window region
$bmp = New-Object System.Drawing.Bitmap($ww, $wh)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($rect.Left, $rect.Top, 0, 0, (New-Object System.Drawing.Size($ww, $wh)))
$savePath = "C:\Users\Judit\Documents\Cals2Gains\instagram\screenshots\chrome_window.png"
$bmp.Save($savePath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()

$info = [System.Drawing.Image]::FromFile($savePath)
Write-Output "Saved: $($info.Width)x$($info.Height)"
$info.Dispose()
