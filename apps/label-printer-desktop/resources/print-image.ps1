param(
    [Parameter(Mandatory=$true)]
    [string]$PrinterName,

    [Parameter(Mandatory=$true)]
    [string]$ImagePath,

    [Parameter(Mandatory=$false)]
    [int]$Copies = 1
)

# Печать изображения через mspaint /pt — надёжный способ тихой печати на Windows.
# PrintDocument.Print() зависает с драйверами TSC (блокировка на уровне спулера).

try {
    Write-Host "=== Print Image (mspaint) ==="
    Write-Host "Printer: $PrinterName"
    Write-Host "Image: $ImagePath"
    Write-Host "Copies: $Copies"

    if (-not (Test-Path $ImagePath)) {
        throw "Image file not found: $ImagePath"
    }

    for ($i = 1; $i -le $Copies; $i++) {
        if ($Copies -gt 1) {
            Write-Host "Printing copy $i of $Copies..."
        }

        $proc = Start-Process -FilePath "mspaint" -ArgumentList "/pt `"$ImagePath`" `"$PrinterName`"" -Wait -NoNewWindow -PassThru

        if ($proc.ExitCode -ne 0) {
            throw "mspaint exited with code $($proc.ExitCode)"
        }
    }

    Write-Host "Image sent to printer successfully"
    exit 0
}
catch {
    Write-Error "Failed to print image: $_"
    exit 1
}
