# Email Configuration Validator
# Checks if email environment variables are correctly set

Write-Host "🔍 Checking Email Configuration..." -ForegroundColor Cyan
Write-Host "=" * 60

$envFile = ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ .env file not found in root directory" -ForegroundColor Red
    Write-Host "`n💡 Create a .env file with your Resend configuration" -ForegroundColor Yellow
    exit 1
}

$envContent = Get-Content $envFile
$foundVars = @{}
$errors = @()
$warnings = @()

# Parse .env file
foreach ($line in $envContent) {
    $trimmed = $line.Trim()
    if ($trimmed -and -not $trimmed.StartsWith('#')) {
        if ($trimmed -match '^([A-Z_]+)=(.*)$') {
            $key = $matches[1]
            $value = $matches[2] -replace '^["'']|["'']$', ''  # Remove quotes
            $foundVars[$key] = $value
        }
    }
}

# Required variables
$requiredVars = @{
    'RESEND_API_KEY' = @{
        description = 'Resend API Key (REQUIRED)'
        example = 're_xxxxxxxxxxxxxxxxxxxxx'
    }
}

# Optional variables
$optionalVars = @{
    'RESEND_FROM_EMAIL' = @{
        description = 'Default email address'
        example = 'BLINNO <noreply@blinno.com>'
    }
    'RESEND_ONBOARDING_EMAIL' = @{
        description = 'Onboarding emails'
        example = 'BLINNO <onboarding@blinno.com>'
    }
    'RESEND_SUPPORT_EMAIL' = @{
        description = 'Support emails'
        example = 'BLINNO Support <support@blinno.com>'
    }
    'RESEND_FINANCE_EMAIL' = @{
        description = 'Finance emails'
        example = 'BLINNO Finance <finance@blinno.com>'
    }
    'RESEND_ORDERS_EMAIL' = @{
        description = 'Order emails'
        example = 'BLINNO Orders <orders@blinno.com>'
    }
    'RESEND_SECURITY_EMAIL' = @{
        description = 'Security emails'
        example = 'BLINNO Security <security@blinno.com>'
    }
    'RESEND_MARKETING_EMAIL' = @{
        description = 'Marketing emails'
        example = 'BLINNO <marketing@blinno.com>'
    }
    'RESEND_SYSTEM_EMAIL' = @{
        description = 'System emails'
        example = 'BLINNO <system@blinno.com>'
    }
}

# Check required variables
Write-Host "`n📋 Required Variables:" -ForegroundColor Yellow
foreach ($varName in $requiredVars.Keys) {
    $config = $requiredVars[$varName]
    if (-not $foundVars.ContainsKey($varName)) {
        Write-Host "  ❌ $varName - NOT SET" -ForegroundColor Red
        Write-Host "     Description: $($config.description)" -ForegroundColor Gray
        Write-Host "     Example: $($config.example)" -ForegroundColor Gray
        $errors += $varName
    } else {
        $value = $foundVars[$varName]
        # Validate API key format
        if ($varName -eq 'RESEND_API_KEY') {
            if (-not $value.StartsWith('re_')) {
                Write-Host "  ❌ $varName - Invalid format (should start with 're_')" -ForegroundColor Red
                $errors += $varName
            } elseif ($value.Length -lt 20) {
                Write-Host "  ❌ $varName - Invalid format (seems too short)" -ForegroundColor Red
                $errors += $varName
            } else {
                $masked = $value.Substring(0, 7) + "..." + $value.Substring($value.Length - 4)
                Write-Host "  ✅ $varName - Set correctly: $masked" -ForegroundColor Green
            }
        }
    }
}

# Check optional variables
Write-Host "`n📋 Optional Variables:" -ForegroundColor Yellow
foreach ($varName in $optionalVars.Keys) {
    $config = $optionalVars[$varName]
    if (-not $foundVars.ContainsKey($varName)) {
        Write-Host "  ⚠️  $varName - Not set (will use default)" -ForegroundColor Yellow
        Write-Host "     Example: $($config.example)" -ForegroundColor Gray
        $warnings += $varName
    } else {
        $value = $foundVars[$varName]
        # Validate email format: "Name <email@domain.com>"
        if ($value -match '^.+?\s*<[^\s@]+@[^\s@]+\.[^\s@]+>$') {
            Write-Host "  ✅ $varName - Set correctly: $value" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $varName - Invalid format" -ForegroundColor Red
            Write-Host "     Current: $value" -ForegroundColor Gray
            Write-Host "     Expected: $($config.example)" -ForegroundColor Gray
            $errors += $varName
        }
    }
}

Write-Host "`n" + ("=" * 60)

# Summary
if ($errors.Count -gt 0) {
    Write-Host "`n❌ Validation FAILED - Please fix the errors above" -ForegroundColor Red
    Write-Host "`n💡 Tips:" -ForegroundColor Yellow
    Write-Host "   - RESEND_API_KEY is required and should start with 're_'" -ForegroundColor Gray
    Write-Host "   - Email addresses should be in format: 'Name <email@domain.com>'" -ForegroundColor Gray
    Write-Host "   - All addresses must be on your verified domain in Resend" -ForegroundColor Gray
    exit 1
} elseif ($warnings.Count -gt 0) {
    Write-Host "`n✅ Required variables are set correctly!" -ForegroundColor Green
    Write-Host "⚠️  Some optional variables are missing (using defaults)" -ForegroundColor Yellow
    Write-Host "   This is okay, but consider setting them for better customization" -ForegroundColor Gray
    exit 0
} else {
    Write-Host "`n✅ All email configuration variables are correctly set!" -ForegroundColor Green
    exit 0
}

