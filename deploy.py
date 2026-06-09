import os
import json
import urllib.request
import sys

# Load RAILWAY_TOKEN
RAILWAY_TOKEN = os.environ.get("RAILWAY_TOKEN")
if not RAILWAY_TOKEN:
    env_path = "/Users/egemengunes/Desktop/Antigravity/_knowledge/credentials/master.env"
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.strip().startswith("RAILWAY_TOKEN="):
                    RAILWAY_TOKEN = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break

if not RAILWAY_TOKEN:
    print("❌ HATA: master.env içinde RAILWAY_TOKEN bulunamadı.")
    sys.exit(1)

HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {RAILWAY_TOKEN}"
}
URL = "https://backboard.railway.app/graphql/v2"

# Git repository is expected to be named: dijitalhomee-prog/Sinopia-Mant-
REPO = "dijitalhomee-prog/Sinopia-Mant-"

def run_query(query):
    data = json.dumps({"query": query}).encode('utf-8')
    req = urllib.request.Request(URL, data=data, headers=HEADERS)
    try:
        with urllib.request.urlopen(req) as response:
            resp_data = json.loads(response.read().decode())
            return resp_data
    except Exception as e:
        print("Error:", e)
        return {}

STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'railway_state.json')
project_id = None
env_id = None
service_id = None

if os.path.exists(STATE_FILE):
    try:
        with open(STATE_FILE, 'r') as sf:
            state = json.load(sf)
            project_id = state.get('project_id')
            env_id = state.get('environment_id')
            service_id = state.get('service_id')
            print(f"🔄 Mevcut Railway Projesi Yükleniyor: {project_id}")
    except Exception as e:
        pass

if not project_id or not env_id or not service_id:
    print("1. Railway Projesi Oluşturuluyor...")
    q_project = 'mutation { projectCreate(input: { name: "Sinopia Manti", description: "Sinopia Manti Evi Web Sitesi" }) { id environments { edges { node { id } } } } }'
    res_p = run_query(q_project)
    if 'errors' in res_p or not res_p.get('data'):
        print("Project create error:", res_p)
        sys.exit(1)
        
    project_id = res_p['data']['projectCreate']['id']
    env_id = res_p['data']['projectCreate']['environments']['edges'][0]['node']['id']
    print(f"✅ Proje Oluşturuldu. ID: {project_id}")

    print("2. Servis Oluşturuluyor (GitHub'a bağlanıyor)...")
    q_service = f'mutation {{ serviceCreate(input: {{ projectId: "{project_id}", name: "web", source: {{ repo: "{REPO}" }}, branch: "main" }}) {{ id }} }}'
    res_s = run_query(q_service)
    if 'errors' in res_s or not res_s.get('data'):
        print("Service create error (Lütfen GitHub reponuzun doğru adla oluşturulduğundan emin olun):", res_s)
        sys.exit(1)
    service_id = res_s['data']['serviceCreate']['id']
    print(f"✅ Servis Oluşturuldu. ID: {service_id}")
    
    # Save state
    try:
        with open(STATE_FILE, 'w') as sf:
            json.dump({
                'project_id': project_id,
                'environment_id': env_id,
                'service_id': service_id
            }, sf, indent=2)
    except Exception as e:
        print("Error saving state file:", e)
else:
    print(f"✅ Proje ({project_id}) ve Servis ({service_id}) bilgileri mevcut.")

print("3. Özel Alan Adı (Custom Domain) Tanımlanıyor...")

# Bind sinopiamanti.com
print("   - sinopiamanti.com ekleniyor...")
q_domain1 = f'mutation {{ customDomainCreate(input: {{ environmentId: "{env_id}", serviceId: "{service_id}", domain: "sinopiamanti.com" }}) {{ id domain }} }}'
res_d1 = run_query(q_domain1)
if 'errors' in res_d1:
    print("     Uyanı/Hata:", res_d1['errors'][0].get('message'))
else:
    print("     ✅ sinopiamanti.com başarıyla eklendi.")

# Bind www.sinopiamanti.com
print("   - www.sinopiamanti.com ekleniyor...")
q_domain2 = f'mutation {{ customDomainCreate(input: {{ environmentId: "{env_id}", serviceId: "{service_id}", domain: "www.sinopiamanti.com" }}) {{ id domain }} }}'
res_d2 = run_query(q_domain2)
if 'errors' in res_d2:
    print("     Uyanı/Hata:", res_d2['errors'][0].get('message'))
else:
    print("     ✅ www.sinopiamanti.com başarıyla eklendi.")

print("\n--- DEPLOYMENT INITIALIZED ---")
print("Project ID:", project_id)
print("Service ID:", service_id)
print("\n👉 Sonraki Adım: Natro Panelinde DNS CNAME ve A kayıtlarını Railway yönlendirmelerine göre ayarlayın.")
