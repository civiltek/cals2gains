Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class DH2 {
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
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);
    [DllImport("user32.dll")]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, string lParam);
    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
}
"@

$filePath = "C:\Users\Judit\Downloads\macrolens\instagram\posts_es\06_big_reveal.png"
$logFile = "C:\Users\Judit\Downloads\macrolens\dialog_handler2.log"

"$(Get-Date) - Handler2 started" | Out-File $logFile

# Track the initial #32770 dialog (which is a stale one)
$staleDialog = [DH2]::FindWindow("#32770", $null)
"$(Get-Date) - Stale dialog handle: $staleDialog" | Out-File $logFile -Append

# Wait for a NEW #32770 dialog (different handle) for up to 30 seconds
$found = $false
for ($i = 0; $i -lt 60; $i++) {
    # Enumerate all visible windows looking for file dialogs
    $dialogFound = $false
    $dialogHandle = [IntPtr]::Zero
    
    [DH2]::EnumWindows({
        param($hWnd, $lParam)
        if ([DH2]::IsWindowVisible($hWnd)) {
            $cls = New-Object System.Text.StringBuilder 256
            [DH2]::GetClassName($hWnd, $cls, 256)
            if ($cls.ToString() -eq "#32770" -and $hWnd -ne $staleDialog) {
                $title = New-Object System.Text.StringBuilder 256
                [DH2]::GetWindowText($hWnd, $title, 256)
                "$(Get-Date) - NEW dialog found: handle=$hWnd title='$($title.ToString())'" | Out-File $script:logFile -Append
                $script:dialogHandle = $hWnd
                $script:dialogFound = $true
                return $false  # stop enumeration
            }
        }
        return $true
    }, [IntPtr]::Zero)
    
    if ($dialogFound -and $dialogHandle -ne [IntPtr]::Zero) {
        "$(Get-Date) - Processing new dialog: $dialogHandle" | Out-File $logFile -Append
        
        Start-Sleep -Milliseconds 500
        [DH2]::SetForegroundWindow($dialogHandle)
        Start-Sleep -Milliseconds 500
        
        # Try to find edit box via ComboBoxEx32 chain
        $comboBoxEx = [DH2]::FindWindowEx($dialogHandle, [IntPtr]::Zero, "ComboBoxEx32", $null)
        "$(Get-Date) - ComboBoxEx32: $comboBoxEx" | Out-File $logFile -Append
        
        $editBox = [IntPtr]::Zero
        if ($comboBoxEx -ne [IntPtr]::Zero) {
            $comboBox = [DH2]::FindWindowEx($comboBoxEx, [IntPtr]::Zero, "ComboBox", $null)
            "$(Get-Date) - ComboBox: $comboBox" | Out-File $logFile -Append
            if ($comboBox -ne [IntPtr]::Zero) {
                $editBox = [DH2]::FindWindowEx($comboBox, [IntPtr]::Zero, "Edit", $null)
                "$(Get-Date) - Edit: $editBox" | Out-File $logFile -Append
            }
        }
        
        if ($editBox -ne [IntPtr]::Zero) {
            # Set the file path using WM_SETTEXT (0x000C)
            [DH2]::SendMessage($editBox, 0x000C, [IntPtr]::Zero, $filePath)
            Start-Sleep -Milliseconds 500
            
            # Find and click Open/Abrir button
            $openBtn = [DH2]::FindWindowEx($dialogHandle, [IntPtr]::Zero, "Button", "&Abrir")
            if ($openBtn -eq [IntPtr]::Zero) { $openBtn = [DH2]::FindWindowEx($dialogHandle, [IntPtr]::Zero, "Button", "Abrir") }
            if ($openBtn -eq [IntPtr]::Zero) { $openBtn = [DH2]::FindWindowEx($dialogHandle, [IntPtr]::Zero, "Button", "&Open") }
            if ($openBtn -eq [IntPtr]::Zero) { $openBtn = [DH2]::FindWindowEx($dialogHandle, [IntPtr]::Zero, "Button", "Open") }
            
            "$(Get-Date) - Open button: $openBtn" | Out-File $logFile -Append
            
            if ($openBtn -ne [IntPtr]::Zero) {
                [DH2]::PostMessage($openBtn, 0x00F5, [IntPtr]::Zero, [IntPtr]::Zero)
                "$(Get-Date) - Clicked Open via BM_CLICK" | Out-File $logFile -Append
            } else {
                # Fallback: Send Enter
                Add-Type -AssemblyName System.Windows.Forms
                [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
                "$(Get-Date) - Sent Enter key" | Out-File $logFile -Append
            }
            $found = $true
            break
        } else {
            # Fallback: SendKeys approach
            "$(Get-Date) - No edit box, using SendKeys" | Out-File $logFile -Append
            Add-Type -AssemblyName System.Windows.Forms
            [DH2]::SetForegroundWindow($dialogHandle)
            Start-Sleep -Milliseconds 300
            
            # Type the file path into the filename field
            [System.Windows.Forms.Clipboard]::SetText($filePath)
            Start-Sleep -Milliseconds 200
            [System.Windows.Forms.SendKeys]::SendWait("%n")  # Alt+N to focus filename field
            Start-Sleep -Milliseconds 300
            [System.Windows.Forms.SendKeys]::SendWait("^a")   # Select all
            Start-Sleep -Milliseconds 100
            [System.Windows.Forms.SendKeys]::SendWait("^v")   # Paste
            Start-Sleep -Milliseconds 300
            [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
            "$(Get-Date) - Sent path via SendKeys with Alt+N" | Out-File $logFile -Append
            $found = $true
            break
        }
    }
    
    Start-Sleep -Milliseconds 500
}

if (-not $found) { "$(Get-Date) - No new dialog found after 30s" | Out-File $logFile -Append }
"$(Get-Date) - Handler2 finished" | Out-File $logFile -Append
