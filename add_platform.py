import requests
import json

ENDPOINT = "https://fra.cloud.appwrite.io/v1"
PROJECT_ID = "69e27c6a00027fe0dfc5"
API_KEY = "standard_e759ae7feff6510671acea61330ca1b144bbf1766bd4fa34d222fc9fd3bb829b7e73b19e945d9258c81bebca23b344e5a5326328ab7ecee38a99e1dcd9c7cd190d0417d191e95562a51a5f1d4898d651f34b2046bba6b6e446fe3a5f94de69cf78993c4430c4efeb14346dcbea77b1535e784c85a1188a39a83885f1b57cb01e"

# Add localhost as web platform
url = f"{ENDPOINT}/projects/{PROJECT_ID}/platforms"
headers = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": PROJECT_ID,
    "X-Appwrite-Key": API_KEY,
}
data = {
    "type": "web",
    "name": "localhost",
    "hostname": "localhost"
}

resp = requests.post(url, headers=headers, json=data)
print(f"Status: {resp.status_code}")
print(f"Response: {resp.text[:500]}")
