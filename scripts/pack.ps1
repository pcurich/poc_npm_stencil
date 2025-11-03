param(
    [string]$OutDir = "releases"
)

Write-Host "Packing npm package..."

# Ensure output directory exists
if (-not (Test-Path -Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir | Out-Null
}

# Run npm pack and capture output
$packOutput = npm pack
Write-Host $packOutput

# Read package.json to compute expected tarball name (npm pack strips @ and replaces / with -)
try {
    $pkg = Get-Content -Raw package.json | ConvertFrom-Json
} catch {
    Write-Error "Failed to read package.json: $_"
    exit 1
}

$pkgName = $pkg.name -replace '^@','' -replace '/','-'
$pkgVersion = $pkg.version
$expectedTar = "$($pkgName)-$($pkgVersion).tgz"

Write-Host "Looking for tarball: $expectedTar"

if (Test-Path -Path $expectedTar) {
    $tarball = $expectedTar
} else {
    # Fallback: pick most recent .tgz created
    $created = Get-ChildItem -Path . -Filter '*.tgz' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($null -eq $created) {
        Write-Error "No tarball found in current directory"
        exit 1
    }
    $tarball = $created.Name
}

$dest = Join-Path -Path $OutDir -ChildPath $tarball
Write-Host "Moving $tarball -> $dest"
Move-Item -Path $tarball -Destination $dest -Force

Write-Host "Pack complete. Tarball moved to: $dest"
