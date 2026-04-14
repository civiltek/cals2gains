Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class DialogHandler {
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindowEx(IntPtr hwndParent, IntPtr hwndChildAfter, string lpszClass, string lpszWindow);
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")]
    public static extern bool EnumChildWindows(IntPtr hwndParent, EnumWindowsProc lpEnumFunc, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);
    [DllImport("user32.dll")]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, string lParam);
    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
}
"@

$filePath = "C:\Users\Judit\Downloads\macrolens\instagram\posts_es\06_big_reveal.png"
$logFile = "C:\Users\Judit\Downloads\macrolens\dialog_handler.log"

"$(Get-Date) - Dialog handler started, watching for file dialog..." | Out-File $logFile

# Wait up to 30 seconds for a file dialog to appear
$found = $false
for ($i = 0; $i -lt 60; $i++) {
    $dialog = [DialogHandler]::FindWindow("#32770", "Abrir")
    if ($dialog -eq [IntPtr]::Zero) {
        $dialog = [DialogHandler]::FindWindow("#32770", "Open")
    }
    if ($dialog -eq [IntPtr]::Zero) {
        # Try any #32770 dialog
        $dialog = [DialogHandler]::FindWindow("#32770", $null)
    }
    
    if ($dialog -ne [IntPtr]::Zero) {
        $title = New-Object System.Text.StringBuilder 256
        [DialogHandler]::GetWindowText($dialog, $title, 256)
        "$(Get-Date) - Found dialog: $($title.ToString()) handle=$dialog" | Out-File $logFile -Append
        
        # Bring dialog to front
        [DialogHandler]::ShowWindow($dialog, 9)
        Start-Sleep -Milliseconds 300
        [DialogHandler]::SetForegroundWindow($dialog)
        Start-Sleep -Milliseconds 500
        
        # Find the filename edit box (ComboBoxEx32 > ComboBox > Edit or directly Edit class)
        $editBox = [IntPtr]::Zero
        
        # Try to find the filename field
        # In Windows file dialog, the edit box for filename is typically in a ComboBoxEx32
        $comboBoxEx = [DialogHandler]::FindWindowEx($dialog, [IntPtr]::Zero, "ComboBoxEx32", $null)
        if ($comboBoxEx -ne [IntPtr]::Zero) {
            $comboBox = [DialogHandler]::FindWindowEx($comboBoxEx, [IntPtr]::Zero, "ComboBox", $null)
            if ($comboBox -ne [IntPtr]::Zero) {
                $editBox = [DialogHandler]::FindWindowEx($comboBox, [IntPtr]::Zero, "Edit", $null)
            }
        }
        
        if ($editBox -ne [IntPtr]::Zero) {
            "$(Get-Date) - Found edit box: $editBox" | Out-File $logFile -Append
            
            # Set the file path using WM_SETTEXT
            [DialogHandler]::SendMessage($editBox, 0x000C, [IntPtr]::Zero, $filePath)
            Start-Sleep -Milliseconds 300
            
            # Find and click the Open button
            $openBtn = [DialogHandler]::FindWindowEx($dialog, [IntPtr]::Zero, "Button", "&Abrir")
            if ($openBtn -eq [IntPtr]::Zero) {
                $openBtn = [DialogHandler]::FindWindowEx($dialog, [IntPtr]::Zero, "Button", "Abrir")
            }
            if ($openBtn -eq [IntPtr]::Zero) {
                $openBtn = [DialogHandler]::FindWindowEx($dialog, [IntPtr]::Zero, "Button", "&Open")
            }
            
            if ($openBtn -ne [IntPtr]::Zero) {
                "$(Get-Date) - Found Open button: $openBtn, clicking..." | Out-File $logFile -Append
                # BM_CLICK
                [DialogHandler]::PostMessage($openBtn, 0x00F5, [IntPtr]::Zero, [IntPtr]::Zero)
                "$(Get-Date) - Clicked Open button" | Out-File $logFile -Append
            } else {
                "$(Get-Date) - Open button not found, trying Enter key" | Out-File $logFile -Append
                # Try pressing Enter as fallback
                Add-Type -AssemblyName System.Windows.Forms
                [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
            }
            
            $found = $true
            break
        } else {
            "$(Get-Date) - Edit box not found in dialog, trying SendKeys approach" | Out-File $logFile -Append
            
            # Fallback: use SendKeys
            Add-Type -AssemblyName System.Windows.Forms
            Start-Sleep -Milliseconds 500
            
            # Clear any existing text and type the path
            [System.Windows.Forms.SendKeys]::SendWait("^a")
            Start-Sleep -Milliseconds 100
            
            # Type the file path character by character to avoid special char issues
            [System.Windows.Forms.Clipboard]::SetText($filePath)
            [System.Windows.Forms.SendKeys]::SendWait("^v")
            Start-Sleep -Milliseconds 300
            [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
            
            "$(Get-Date) - Sent path via SendKeys" | Out-File $logFile -Append
            $found = $true
            break
        }
    }
    
    Start-Sleep -Milliseconds 500
}

if (-not $found) {
    "$(Get-Date) - No dialog found after 30 seconds" | Out-File $logFile -Append
}

"$(Get-Date) - Dialog handler finished" | Out-File $logFile -Append
