# Send plain-text email via Outlook (no attachment - avoids outbox stuck)
param(
  [Parameter(Mandatory = $true)][string]$To,
  [Parameter(Mandatory = $true)][string]$Subject,
  [Parameter(Mandatory = $true)][string]$Body,
  [string]$FromAccount = "tabish.david@gmail.com"
)

try {
  $outlook = New-Object -ComObject Outlook.Application
  $ns = $outlook.GetNamespace("MAPI")

  $account = $null
  foreach ($a in $ns.Accounts) {
    if ($a.SmtpAddress -eq $FromAccount) { $account = $a; break }
  }
  if (-not $account) { Write-Error "Account not found"; exit 1 }

  $mail = $outlook.CreateItem(0)
  $mail.SendUsingAccount = $account
  $mail.To = $To
  $mail.Subject = $Subject
  $mail.Body = $Body
  $mail.Send()

  Start-Sleep -Seconds 2
  try { $ns.SendAndReceive($false) } catch { }
  Start-Sleep -Seconds 6

  $pending = $ns.GetDefaultFolder(4).Items.Count
  Write-Output ("outbox-pending:" + $pending)
  if ($pending -gt 0) { exit 2 }
  Write-Output "sent-ok"
  exit 0
}
catch {
  Write-Error $_.Exception.Message
  exit 1
}
