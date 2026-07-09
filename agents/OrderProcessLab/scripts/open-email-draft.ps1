# Open the EML draft so user can click Send (Outlook outbox was stuck)
param(
  [string]$EmlPath = "$PSScriptRoot\..\output\email-to-tabish.david-at-gmail.com.eml"
)

$resolved = (Resolve-Path $EmlPath -ErrorAction Stop).Path
Write-Output "Opening: $resolved"
Start-Process $resolved
Write-Output "opened-eml"
