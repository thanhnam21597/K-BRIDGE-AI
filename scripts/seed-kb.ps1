param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$SeedApiKey = ""
)

$headers = @{}
if ($SeedApiKey -ne "") {
  $headers["Authorization"] = "Bearer $SeedApiKey"
}

Write-Host "Seeding KB to $BaseUrl/api/admin/seed-kb ..."
$response = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/admin/seed-kb" -Headers $headers
$response | ConvertTo-Json -Depth 5
