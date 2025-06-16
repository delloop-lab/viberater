$modelFiles = @(
    "tiny_face_detector_model-weights_manifest.json",
    "tiny_face_detector_model-shard1",
    "age_gender_model-weights_manifest.json",
    "age_gender_model-shard1",
    "face_expression_model-weights_manifest.json",
    "face_expression_model-shard1"
)

$baseUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

# Create models directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "public/models"

foreach ($file in $modelFiles) {
    $url = "$baseUrl/$file"
    $output = "public/models/$file"
    Write-Host "Downloading $file..."
    Invoke-WebRequest -Uri $url -OutFile $output
}

Write-Host "All models downloaded successfully!" 