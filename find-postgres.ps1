# Find PostgreSQL/EDB Installation
# This script helps locate your PostgreSQL or EDB PostgreSQL installation

Write-Host "=== Finding PostgreSQL/EDB Installation ===" -ForegroundColor Cyan
Write-Host ""

# Common installation paths
$searchPaths = @(
    "C:\Program Files\PostgreSQL",
    "C:\Program Files (x86)\PostgreSQL",
    "C:\Program Files\edb",
    "C:\Program Files (x86)\edb"
)

$foundInstallations = @()

foreach ($basePath in $searchPaths) {
    if (Test-Path $basePath) {
        Write-Host "Searching in: $basePath" -ForegroundColor Yellow
        
        # Find all psql.exe files recursively
        $psqlFiles = Get-ChildItem -Path $basePath -Filter "psql.exe" -Recurse -ErrorAction SilentlyContinue
        
        foreach ($psql in $psqlFiles) {
            $version = $null
            $parentDir = $psql.Directory.Parent.Name
            
            # Try to extract version from path
            if ($psql.FullName -match "\\as\\(\d+)") {
                $version = $matches[1]
            } elseif ($psql.FullName -match "\\(\d+)\\") {
                $version = $matches[1]
            }
            
            $foundInstallations += [PSCustomObject]@{
                Path = $psql.FullName
                Version = $version
                Type = if ($psql.FullName -match "\\edb\\") { "EDB PostgreSQL" } else { "PostgreSQL" }
            }
        }
    }
}

if ($foundInstallations.Count -eq 0) {
    Write-Host "No PostgreSQL installations found in common locations." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "1. Is PostgreSQL/EDB installed?"
    Write-Host "2. Is it installed in a custom location?"
    Write-Host "3. You can manually provide the path when running setup-database.ps1"
} else {
    Write-Host "Found $($foundInstallations.Count) installation(s):" -ForegroundColor Green
    Write-Host ""
    
    foreach ($install in $foundInstallations) {
        Write-Host "Type: $($install.Type)" -ForegroundColor Cyan
        if ($install.Version) {
            Write-Host "Version: $($install.Version)" -ForegroundColor Cyan
        }
        Write-Host "Path: $($install.Path)" -ForegroundColor Green
        Write-Host ""
    }
    
    Write-Host "You can use any of these paths in the setup script." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Checking if psql is in PATH..." -ForegroundColor Cyan
$psqlInPath = Get-Command psql -ErrorAction SilentlyContinue
if ($psqlInPath) {
    Write-Host "[OK] psql is available in PATH: $($psqlInPath.Source)" -ForegroundColor Green
} else {
    Write-Host "[X] psql is not in PATH" -ForegroundColor Yellow
    Write-Host "Consider adding the bin directory to your PATH environment variable" -ForegroundColor Yellow
}

