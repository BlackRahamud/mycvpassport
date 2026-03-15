# Run this script as Administrator to set RemoteSigned for all users (LocalMachine).
# Right-click PowerShell -> "Run as administrator", then run:
#   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine -Force
# Or run this script elevated:
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine -Force
Write-Host "Execution policy set to RemoteSigned for LocalMachine (all scopes). Press any key to close."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
