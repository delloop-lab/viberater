$url = "https://storage.googleapis.com/tfjs-models/weights/face_landmark_68/face_landmark_68_model-shard1"
$output = "public\models\face_landmark_68_model-shard1"
$wc = New-Object System.Net.WebClient
$wc.Headers.Add("User-Agent", "Mozilla/5.0")
$wc.DownloadFile($url, $output)
Copy-Item "public\models\face_landmark_68_model-shard1" "models\face_landmark_68_model-shard1" 