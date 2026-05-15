# Resolve junction links in node_modules
param(
    [string]$Path = "C:\web\lena\apps\animatrona\dist\win-unpacked\resources\standalone\node_modules"
)

Set-Location $Path
Write-Host "Working in: $Path"

Get-ChildItem | Where-Object { $_.Attributes -band [System.IO.FileAttributes]::ReparsePoint } | ForEach-Object {
    $target = (Get-Item $_.FullName).Target
    $name = $_.Name
    Write-Host "Resolving: $name -> $target"
    Remove-Item $_.FullName -Force
    Copy-Item -Path $target -Destination $name -Recurse
    Write-Host "Done: $name"
}

Write-Host "All junctions resolved!"