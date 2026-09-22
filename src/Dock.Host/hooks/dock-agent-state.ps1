$paneId = $env:DOCK_PANE_ID
if ([string]::IsNullOrWhiteSpace($paneId)) { exit 0 }

$raw = [Console]::In.ReadToEnd()
try { $hook = $raw | ConvertFrom-Json } catch { exit 0 }

$directory = Join-Path $env:LOCALAPPDATA 'Dock\agents'
$file = Join-Path $directory "$paneId.json"
$eventName = [string]$hook.hook_event_name

if ($eventName -eq 'SessionEnd') {
    Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue
    exit 0
}

$waitingNotifications = @('permission_prompt', 'elicitation_dialog', 'agent_needs_input')
$state = $null
$message = $null
switch ($eventName) {
    'SessionStart' { $state = 'unknown' }
    'UserPromptSubmit' { $state = 'working' }
    'PreToolUse' { if ($hook.tool_name -eq 'AskUserQuestion') { $state = 'waiting'; $message = 'Question posée.' } }
    'PostToolUse' { $state = 'working' }
    'Stop' { $state = 'done' }
    'StopFailure' { $state = 'error'; $message = 'Erreur signalée par Claude Code.' }
    'PermissionRequest' { $state = 'waiting'; $message = "Autorisation demandée : $($hook.tool_name)" }
    'Notification' {
        if ($hook.notification_type -in $waitingNotifications) {
            if (Test-Path -LiteralPath $file) {
                try { if ((Get-Content -LiteralPath $file -Raw -Encoding UTF8 | ConvertFrom-Json).state -eq 'waiting') { exit 0 } } catch { }
            }
            $state = 'waiting'
            $message = if ($hook.notification_type -eq 'permission_prompt') { 'Autorisation demandée.' } else { 'Saisie attendue.' }
        }
    }
}
if (-not $state) { exit 0 }

New-Item -ItemType Directory -Path $directory -Force | Out-Null
$json = @{ agent = 'claude'; state = $state; message = $message } | ConvertTo-Json -Compress
[System.IO.File]::WriteAllText($file, $json, [System.Text.UTF8Encoding]::new($false))
