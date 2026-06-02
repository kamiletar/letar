# Запускает SSH-туннель если нужно, затем postgres MCP
# Использование: pg-ssh-tunnel.ps1 <connection-string> <local-port> <remote-host> <remote-port>
param(
    [Parameter(Mandatory)][string]$ConnectionString,
    [Parameter(Mandatory)][int]$LocalPort,
    [Parameter(Mandatory)][string]$RemoteHost,
    [Parameter(Mandatory)][int]$RemotePort
)

$sshExe = "$env:SystemRoot\System32\OpenSSH\ssh.exe"
$sshKey = "$env:USERPROFILE\.ssh\id_rsa"

# Проверяем слушает ли порт
$portOpen = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("127.0.0.1", $LocalPort)
    $portOpen = $tcp.Connected
    $tcp.Close()
} catch { $portOpen = $false }

if (-not $portOpen) {
    Start-Process -FilePath $sshExe `
        -ArgumentList "-i `"$sshKey`" -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -L ${LocalPort}:localhost:${RemotePort} -N $RemoteHost" `
        -WindowStyle Hidden

    # Ждём пока порт откроется (макс 20 сек)
    $elapsed = 0
    do {
        Start-Sleep -Seconds 1
        $elapsed++
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.Connect("127.0.0.1", $LocalPort)
            $portOpen = $tcp.Connected
            $tcp.Close()
        } catch { $portOpen = $false }
    } while (-not $portOpen -and $elapsed -lt 20)
}

& bunx @modelcontextprotocol/server-postgres $ConnectionString
