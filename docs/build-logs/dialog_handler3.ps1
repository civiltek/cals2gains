Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class DialogHandler {
    [DllImport("user32.dll")] public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern IntPtr FindWindowEx(IntPtr hwndParent, IntPtr hwndChildAfter, string lpszClass, string lpszWindow);
    [DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder sb, int nMaxCount);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
}
"@

$logFile = "C:\Users\Judit\Downloads\macrolens\dialog_log.txt"
$targetFile = "C:\Users\Judit\Downloads\macrolens\instagram\posts_es\06_big_reveal.png"

# Get Chrome process IDs
$chromeIds = @(Get-Process chrome -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
"$(Get-Date): Watching for file dialog. Chrome PIDs: $($chromeIds -join ',')" | Out-File $logFile

$found = $false
$maxWait = 60  # seconds
$elapsed = 0

while (-not $found -and $elapsed -lt $maxWait) {
    # Look for open/save dialog windows (#32770 class)
    $dialogs = @()
    $callback = [DialogHandler+EnumWindowsProc]{
        param($hWnd, $lParam)
        $sb = New-Object System.Text.StringBuilder 256
        [DialogHandler]::GetWindowText($hWnd, $sb, 256) | Out-Null
        $title = $sb.ToString()
        if ($title -match "Abrir|Open|Cargar|Upload" -and [DialogHandler]::IsWindowVisible($hWnd)) {
            $pid = 0
            [DialogHandler]::GetWindowThreadProcessId($hWnd, [ref]$pid) | Out-Null
            if ($chromeIds -contains $pid) {
                $script:dialogHwnd = $hWnd
                $script:dialogTitle = $title
                $script:dialogPid = $pid
            }
        }
        return $true
    }
    [DialogHandler]::EnumWindows($callback, [IntPtr]::Zero)
    
    if ($script:dialogHwnd -and $script:dialogHwnd -ne [IntPtr]::Zero) {
        $found = $true
        "$(Get-Date): Found dialog! Title='$($script:dialogTitle)' HWND=$($script:dialogHwnd) PID=$($script:dialogPid)" | Out-File $logFile -Append
        
        # Focus the dialog
        [DialogHandler]::SetForegroundWindow($script:dialogHwnd)
        Start-Sleep -Milliseconds 500
        
        # Find the filename edit box (ComboBoxEx32 > ComboBox > Edit)
        $comboBoxEx = [DialogHandler]::FindWindowEx($script:dialogHwnd, [IntPtr]::Zero, "ComboBoxEx32", $null)
        if ($comboBoxEx -ne [IntPtr]::Zero) {
            $comboBox = [DialogHandler]::FindWindowEx($comboBoxEx, [IntPtr]::Zero, "ComboBox", $null)
            if ($comboBox -ne [IntPtr]::Zero) {
                $edit = [DialogHandler]::FindWindowEx($comboBox, [IntPtr]::Zero, "Edit", $null)
                "$(Get-Date): Found edit control: $edit" | Out-File $logFile -Append
            }
        }
        
        # Use SendKeys to type the path
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.SendKeys]::SendWait($targetFile)
        Start-Sleep -Milliseconds 300
        [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
        "$(Get-Date): Sent file path and Enter" | Out-File $logFile -Append
        
    } else {
        Start-Sleep -Milliseconds 500
        $elapsed += 0.5
    }
}

if (-not $found) {
    "$(Get-Date): Timeout - no dialog found after $maxWait seconds" | Out-File $logFile -Append
}