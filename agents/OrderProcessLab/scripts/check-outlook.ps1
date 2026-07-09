try {
  $ol = New-Object -ComObject Outlook.Application
  $ns = $ol.GetNamespace("MAPI")
  Write-Output "Outlook accounts: $($ns.Accounts.Count)"
  foreach ($a in $ns.Accounts) {
    Write-Output " - $($a.SmtpAddress)"
  }
  $sent = $ns.GetDefaultFolder(5)
  Write-Output "Sent items count: $($sent.Items.Count)"
  $outbox = $ns.GetDefaultFolder(4)
  Write-Output "Outbox count: $($outbox.Items.Count)"
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ol) | Out-Null
} catch {
  Write-Output "Outlook error: $($_.Exception.Message)"
}
