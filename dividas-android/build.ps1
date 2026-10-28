param([ValidateSet('debug','bundle','personal')][string]$Task='personal')
$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Get-Command java -ErrorAction SilentlyContinue) -and -not $env:JAVA_HOME) {
    throw 'Java 17 não encontrado. Configure o JDK antes de gerar o app.'
}
$taskSdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { $env:ANDROID_SDK_ROOT }
if (-not $taskSdk -or -not (Test-Path -LiteralPath $taskSdk)) {
    throw 'Android SDK não encontrado. Configure ANDROID_HOME antes de gerar o app.'
}
python (Join-Path $PSScriptRoot 'prepare-assets.py')
if ($LASTEXITCODE -ne 0) { throw 'Falha ao preparar os arquivos do aplicativo.' }
$taskTools = Join-Path $PSScriptRoot '.tools'
$taskGradle = Join-Path $taskTools 'gradle-8.13\bin\gradle.bat'
if (-not (Test-Path -LiteralPath $taskGradle)) {
    New-Item -ItemType Directory -Path $taskTools -Force | Out-Null
    $taskZip = Join-Path $taskTools 'gradle-8.13-bin.zip'
    $taskChecksum = (Invoke-RestMethod 'https://services.gradle.org/distributions/gradle-8.13-bin.zip.sha256').Trim()
    if ($taskChecksum -notmatch '^[a-fA-F0-9]{64}$') { throw 'Resposta de checksum inválida.' }
    Invoke-WebRequest 'https://services.gradle.org/distributions/gradle-8.13-bin.zip' -OutFile $taskZip
    if ((Get-FileHash -LiteralPath $taskZip -Algorithm SHA256).Hash -ine $taskChecksum) {
        throw 'A verificação do Gradle falhou. O pacote não será executado.'
    }
    Expand-Archive -LiteralPath $taskZip -DestinationPath $taskTools -Force
}
$env:GRADLE_USER_HOME = Join-Path $taskTools 'gradle-user-home'
if ($Task -eq 'bundle') { & $taskGradle '--no-daemon' ':app:bundleRelease' }
elseif ($Task -eq 'personal') { & $taskGradle '--no-daemon' ':app:assemblePersonal' }
else { & $taskGradle '--no-daemon' ':app:assembleDebug' }
if ($LASTEXITCODE -ne 0) { throw 'A compilação Android falhou. Confira os erros acima.' }
