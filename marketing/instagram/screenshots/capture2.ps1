Add-Type @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Windows.Forms;
public class ScreenCap {
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
    
    public static void BringToFrontAndCapture(IntPtr hWnd, string path) {
        SetProcessDPIAware();
        // Restore and bring to front
        ShowWindow(hWnd, 9); // SW_RESTORE
        System.Threading.Thread.Sleep(200);
        SetForegroundWindow(hWnd);
        System.Threading.Thread.Sleep(200);
        // Move to top-left corner
        MoveWindow(hWnd, 0, 0, 540, 1050, true);
        System.Threading.Thread.Sleep(500);
        SetForegroundWindow(hWnd);
        System.Threading.Thread.Sleep(500);
        
        // Capture full screen
        Rectangle bounds = Screen.PrimaryScreen.Bounds;
        using (Bitmap bmp = new Bitmap(bounds.Width, bounds.Height))
        using (Graphics g = Graphics.FromImage(bmp)) {
            g.CopyFromScreen(0, 0, 0, 0, bounds.Size);
            bmp.Save(path, ImageFormat.Png);
        }
    }
}
"@

# Get Chrome window handle
$chrome = Get-Process -Id 13028
$hWnd = $chrome.MainWindowHandle
Write-Output "Chrome handle: $hWnd"

# Bring to front and capture
[ScreenCap]::BringToFrontAndCapture($hWnd, "C:\Users\Judit\Documents\Cals2Gains\instagram\screenshots\full_screen.png")
Write-Output "Screen captured"
