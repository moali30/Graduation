import time
from appwrite.client import Client
from appwrite.services.functions import Functions

c = Client()
c.set_endpoint('https://fra.cloud.appwrite.io/v1')
c.set_project('69e27c6a00027fe0dfc5')
c.set_key('standard_e759ae7feff6510671acea61330ca1b144bbf1766bd4fa34d222fc9fd3bb829b7e73b19e945d9258c81bebca23b344e5a5326328ab7ecee38a99e1dcd9c7cd190d0417d191e95562a51a5f1d4898d651f34b2046bba6b6e446fe3a5f94de69cf78993c4430c4efeb14346dcbea77b1535e784c85a1188a39a83885f1b57cb01e')

f = Functions(c)
FUNC_ID = '69e281aee2dc57bdb62b'

for i in range(60):
    r = f.get(FUNC_ID)
    status = r.latestdeploymentstatus
    print(f"[{i+1}] Build status: {status}")
    if status == 'ready':
        print("BUILD SUCCESSFUL!")
        break
    elif status == 'failed':
        dep = f.get_deployment(FUNC_ID, r.latestdeploymentid)
        print(f"BUILD FAILED! Logs: {dep.buildlogs}")
        break
    time.sleep(10)
else:
    print("Timed out.")
