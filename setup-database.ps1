# BLINNO Database Setup Script
# This script helps set up the PostgreSQL database
# Usage: .\setup-database.ps1 [-Username <username>] [-Password <password>]

param(
    [string]$Username = "",
    [string]$Password = ""
)

Write-Host "=== BLINNO Database Setup ===" -ForegroundColor Cyan
Write-Host ""

# Find PostgreSQL installation (including EDB PostgreSQL)
$psqlPaths = @(
    # Standard PostgreSQL paths
    "C:\Program Files\PostgreSQL\18\bin\psql.exe",
    "C:\Program Files\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files\PostgreSQL\15\bin\psql.exe",
    "C:\Program Files\PostgreSQL\14\bin\psql.exe",
    "C:\Program Files\PostgreSQL\13\bin\psql.exe",
    "C:\Program Files (x86)\PostgreSQL\18\bin\psql.exe",
    "C:\Program Files (x86)\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files (x86)\PostgreSQL\15\bin\psql.exe",
    "C:\Program Files (x86)\PostgreSQL\14\bin\psql.exe",
    "C:\Program Files (x86)\PostgreSQL\13\bin\psql.exe",
    # EDB PostgreSQL Advanced Server paths
    "C:\Program Files\edb\as\18\bin\psql.exe",
    "C:\Program Files\edb\as\16\bin\psql.exe",
    "C:\Program Files\edb\as\15\bin\psql.exe",
    "C:\Program Files\edb\as\14\bin\psql.exe",
    "C:\Program Files\edb\as\13\bin\psql.exe",
    "C:\Program Files\edb\as\12\bin\psql.exe",
    "C:\Program Files (x86)\edb\as\18\bin\psql.exe",
    "C:\Program Files (x86)\edb\as\16\bin\psql.exe",
    "C:\Program Files (x86)\edb\as\15\bin\psql.exe",
    "C:\Program Files (x86)\edb\as\14\bin\psql.exe",
    "C:\Program Files (x86)\edb\as\13\bin\psql.exe",
    "C:\Program Files (x86)\edb\as\12\bin\psql.exe"
)

$psqlPath = $null
foreach ($path in $psqlPaths) {
    if (Test-Path $path) {
        $psqlPath = $path
        Write-Host "Found PostgreSQL at: $path" -ForegroundColor Green
        break
    }
}

if (-not $psqlPath) {
    Write-Host "PostgreSQL psql.exe not found in common locations." -ForegroundColor Yellow
    Write-Host "Please provide the full path to psql.exe:" -ForegroundColor Yellow
    $psqlPath = Read-Host "Path to psql.exe"
    
    if (-not (Test-Path $psqlPath)) {
        Write-Host "Error: psql.exe not found at: $psqlPath" -ForegroundColor Red
        exit 1
    }
}

# Get database credentials
Write-Host ""
if ([string]::IsNullOrWhiteSpace($Username) -or [string]::IsNullOrWhiteSpace($Password)) {
    Write-Host "Enter PostgreSQL credentials:" -ForegroundColor Cyan
    $dbUser = Read-Host "Username (default: postgres)"
    if ([string]::IsNullOrWhiteSpace($dbUser)) {
        $dbUser = "postgres"
    }
    
    $dbPassword = Read-Host "Password" -AsSecureString
    $dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
    )
} else {
    $dbUser = $Username
    $dbPasswordPlain = $Password
    Write-Host "Using provided credentials for user: $dbUser" -ForegroundColor Green
}

# Set environment variable for password
$env:PGPASSWORD = $dbPasswordPlain

Write-Host ""
Write-Host "Creating database 'blinno'..." -ForegroundColor Cyan
& $psqlPath -U $dbUser -d postgres -c "CREATE DATABASE blinno;" 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database 'blinno' created successfully!" -ForegroundColor Green
} else {
    $errorOutput = & $psqlPath -U $dbUser -d postgres -c "SELECT 1 FROM pg_database WHERE datname='blinno';" 2>&1
    if ($errorOutput -match "1") {
        Write-Host "Database 'blinno' already exists." -ForegroundColor Yellow
    } else {
        Write-Host "Error creating database. Please check your credentials." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Running schema migration..." -ForegroundColor Cyan
$schemaPath = Join-Path $PSScriptRoot "backend\src\db\schema.sql"

if (-not (Test-Path $schemaPath)) {
    Write-Host "Error: Schema file not found at: $schemaPath" -ForegroundColor Red
    exit 1
}

& $psqlPath -U $dbUser -d blinno -f $schemaPath

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== Database setup complete! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Update backend/.env with these credentials:"
    Write-Host "   DB_USER=$dbUser"
    Write-Host "   DB_PASSWORD=(your password)"
    Write-Host "   DB_NAME=blinno"
    Write-Host ""
    Write-Host "2. Start the backend server:"
    Write-Host "   cd backend"
    Write-Host "   npm install"
    Write-Host "   npm run dev"
} else {
    Write-Host "Error running schema. Please check the error messages above." -ForegroundColor Red
    exit 1
}

# Clear password from environment
Remove-Item Env:\PGPASSWORD

