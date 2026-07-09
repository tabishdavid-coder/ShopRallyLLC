# Send Order Process video via Outlook using a specific account
param(
  [Parameter(Mandatory = $true)][string]$To,
  [Parameter(Mandatory = $true)][string]$VideoPath,
  [Parameter(Mandatory = $true)][string]$Subject,
  [Parameter(Mandatory = $true)][string]$Body,
  [string]$FromAccount = "tabish.david@gmail.com"
)

if (-not (Test-Path $VideoPath)) {
  Write-Error "Video not found: $VideoPath"
  exit 1
}

$resolved = (Resolve-Path $VideoPath).Path

try {
  $outlook = New-Object -ComObject Outlook.Application
  $ns = $outlook.GetNamespace("MAPI")

  $outbox = $ns.GetDefaultFolder(4)
  if ($outbox.Items.Count -gt 0) {
    Write-Output ("Outbox had " + $outbox.Items.Count + " item(s) - attempting send/receive")
    try { $ns.SendAndReceive($false) } catch { }
    Start-Sleep -Seconds 3
  }

  $account = $null
  foreach ($a in $ns.Accounts) {
    if ($a.SmtpAddress -eq $FromAccount) {
      $account = $a
      break
    }
  }
  if (-not $account) {
    Write-Error ("Outlook account not found: " + $FromAccount)
    exit 1
  }

  $mail = $outlook.CreateItem(0)
  $mail.SendUsingAccount = $account
  $mail.To = $To
  $mail.Subject = $Subject
  $mail.Body = $Body
  [void]$mail.Attachments.Add($resolved)
  $mail.Send()

  Start-Sleep -Seconds 1
  try { $ns.SendAndReceive($false) } catch { }
  Start-Sleep -Seconds 8

  $outboxAfter = $ns.GetDefaultFolder(4).Items.Count
  if ($outboxAfter -gt 0) {
    Write-Error ("Mail still in Outbox (" + $outboxAfter + " pending). Outlook may be offline.")
    exit 2
  }

  Write-Output ("sent-via-outlook:" + $FromAccount)
  exit 0
}
catch {
  Write-Error $_.Exception.Message
  exit 1
}
