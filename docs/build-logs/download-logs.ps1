$logUrl = "https://job-logs.eascdn.net/production/e20107a3-caec-42bc-83d0-19bbc5193f8c/1776040090076-90ec6218-210d-4d3b-8c8f-26d1b7c27c99.txt?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=www-production%40exponentjs.iam.gserviceaccount.com%2F20260413%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20260413T003130Z&X-Goog-Expires=900&X-Goog-SignedHeaders=host&X-Goog-Signature=de58cce1fc1abb77ab57e1a0990cbe728f488a36190a049df297c550a1d08a9946e247513d1c55e08e84b51f7c1da8fb37bb9f87afe0eb276f2e6ed5053ac4cc1054f4b40ac83991517cd290d064488356923d2bfddb87254bd91e5fc0d3449a38b274d4ed8f469103b14bef7f3272fbe7fc041c96d7063f8498a31c0a0652bdc9a292e9a359b1384861544e3b12d0bd6a37c3a58734a3b161a1950313f2f351e3dd67f86deafe8bc3e0a1e785f4ccaec653c3b3da751061f8d86899913466bec03abd632e2253acf0d28755c497310d03571ac28946485c10fda515ea56e5e3e7a2048309b06ff9ca4967c271612a018ed910d45799be295a1ef29da5a953d9"
try {
    $response = Invoke-WebRequest -Uri $logUrl -UseBasicParsing -TimeoutSec 30
    $response.Content | Out-File "C:\Users\Judit\Documents\Cals2Gains\eas-log4.txt" -Encoding utf8
    "Downloaded log 4 successfully"
} catch {
    "Error: $_"
}

$logUrl2 = "https://job-logs.eascdn.net/production/e20107a3-caec-42bc-83d0-19bbc5193f8c/1776040089774-0408e5ad-b6e6-4193-8d06-c047f82629fb.txt?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=www-production%40exponentjs.iam.gserviceaccount.com%2F20260413%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20260413T003130Z&X-Goog-Expires=900&X-Goog-SignedHeaders=host&X-Goog-Signature=b6fb3e7eb5901a56af69f9999b8d3077573b982d5860d9121a7b82b47452278a3817d2ec529b4d666523868c308ab9c746dc91570267deaec763149d09bd32039ee0dc10c702a5d83e6f339ce829696af14efe8cfcc64e6447eafdba37fb77f6742c87a0747b91a11ff244deae58d42914c18a585d8191e669c8dc65281fb0f9dc45d5cbc685dd634983574d57a050649a72d5a82cdaa1035103a188e9f11c7cf5d822f0cb83a92f2fef94cd13192f815e2f18804f3d22e4a9d30cf4c15fad9428c3272f18c7b63d94a68916cba7756094a29a9be8dce3dfdccd821e751255153bbcb200bc3c34494b1ca9fd60e33c98b97bcf11dbba46dff46b93f2a7ac9fa5"
try {
    $response2 = Invoke-WebRequest -Uri $logUrl2 -UseBasicParsing -TimeoutSec 30
    $response2.Content | Out-File "C:\Users\Judit\Documents\Cals2Gains\eas-log3.txt" -Encoding utf8
    "Downloaded log 3 successfully"
} catch {
    "Error: $_"
}
