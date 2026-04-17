import os
import tarfile
from appwrite.client import Client
from appwrite.services.functions import Functions
from appwrite.input_file import InputFile

ENDPOINT = "https://fra.cloud.appwrite.io/v1"
PROJECT_ID = "69e27c6a00027fe0dfc5"
API_KEY = "standard_e759ae7feff6510671acea61330ca1b144bbf1766bd4fa34d222fc9fd3bb829b7e73b19e945d9258c81bebca23b344e5a5326328ab7ecee38a99e1dcd9c7cd190d0417d191e95562a51a5f1d4898d651f34b2046bba6b6e446fe3a5f94de69cf78993c4430c4efeb14346dcbea77b1535e784c85a1188a39a83885f1b57cb01e"

client = Client()
client.set_endpoint(ENDPOINT)
client.set_project(PROJECT_ID)
client.set_key(API_KEY)

functions = Functions(client)

# Step 1: Delete old failed function
OLD_FUNC_ID = "69e27d5b8d034236a2fd"
print(f"Deleting old function {OLD_FUNC_ID}...")
try:
    functions.delete(OLD_FUNC_ID)
    print("Deleted.")
except Exception as e:
    print(f"Could not delete old function: {e}")

# Step 2: Tar the code
tar_path = "code.tar.gz"
print("Zipping code...")
with tarfile.open(tar_path, "w:gz") as tar:
    tar.add("backend_function/main.py", arcname="main.py")
    tar.add("backend_function/requirements.txt", arcname="requirements.txt")

# Step 3: Create new function with longer timeout
print("Creating Function...")
try:
    function = functions.create(
        function_id='unique()',
        name='Stat_Analysis_v2',
        runtime='python-3.9',
        execute=['any'],
        events=[],
        schedule="",
        timeout=30,
        enabled=True
    )
    
    if isinstance(function, dict):
        function_id = function.get('$id')
    else:
        function_id = getattr(function, 'id', None)
        
    print(f"Function created: {function_id}")
except Exception as e:
    print(f"Failed to create function: {e}")
    exit(1)

# Step 4: Create deployment
print("Uploading deployment...")
try:
    deployment = functions.create_deployment(
        function_id=function_id,
        entrypoint='main.py',
        commands='pip install -r requirements.txt',
        code=InputFile.from_path(tar_path),
        activate=True
    )
    print("Deployment uploaded!")
    print(f"FUNCTION_ID = {function_id}")
    
    with open("function_id.txt", "w") as f:
        f.write(function_id)

except Exception as e:
    print(f"Failed to deploy code: {e}")
    
finally:
    if os.path.exists(tar_path):
        os.remove(tar_path)
