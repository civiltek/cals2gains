Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class CapDPI {
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT r);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
'@
[CapDPI]::SetProcessDPIAware()
Start-Sleep -Milliseconds 200
[CapDPI]::SetForegroundWindow([IntPtr]1707074)
Start-Sleep -Milliseconds 500
$r = New-Object CapDPI+RECT
[CapDPI]::GetWindowRect([IntPtr]1707074, [ref]$r) | Out-Null
$w = $r.Right - $r.Left
$h = $r.Bottom - $r.Top
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($r.Left, $r.Top, 0, 0, [System.Drawing.Size]::new($w, $h))
$g.Dispose()
$bmp.Save('C:\Users\Judit\Documents\Cals2Gains\instagram\screenshots\pwa_dashboard.png', [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "Saved: ${w}x${h}"
