# Helper script to run Promptfoo evaluation
# Ensure you have set your GEMINI_API_KEY environment variable.
# Example: $env:GEMINI_API_KEY="your-key-here"

Write-Host "Running Promptfoo evaluations..." -ForegroundColor Cyan
npx promptfoo eval -c promptfooconfig.yaml

Write-Host "Evaluation completed. To view results in your browser, run:" -ForegroundColor Green
Write-Host "npx promptfoo view" -ForegroundColor Yellow
