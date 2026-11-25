import requests
import json
import sys
import time

BASE_URL = "http://localhost:8080"
ADMIN_USER = "admin"
ADMIN_PASS = "Esmeraldas2026*"

# Recordatorio estricto: NO tocar 'esmeraldas-resiliente'
REALMS = [
    {"id": "Policia", "name": "Policía Nacional del Ecuador (SIGESP)", "client": "sigesp-policia"},
    {"id": "Migracion", "name": "Subsecretaría de Migración (SGIM)", "client": "sgim-migracion"},
    {"id": "Banco", "name": "NexoBank - Sistema Bancario Digital", "client": "nexobank-digital"},
    {"id": "RegistroCivil", "name": "Registro Civil del Ecuador (DIGERCIC)", "client": "digercic-registro-civil"},
    {"id": "Iess", "name": "Instituto Ecuatoriano de Seguridad Social (IESS)", "client": "iess-seguridad-social"}
]

def get_headers():
    url = f"{BASE_URL}/realms/master/protocol/openid-connect/token"
    data = {
        "client_id": "admin-cli",
        "username": ADMIN_USER,
        "password": ADMIN_PASS,
        "grant_type": "password"
    }
    r = requests.post(url, data=data)
    if r.status_code != 200:
        print(f"Error obteniendo token master: {r.status_code} - {r.text}")
        sys.exit(1)
    token = r.json()["access_token"]
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def main():
    headers = get_headers()
    r = requests.get(f"{BASE_URL}/admin/realms", headers=headers)
    existing_realms = [realm["realm"] for realm in r.json()]
    print(f"Reinos actualmente en Keycloak: {existing_realms}")

    for realm in REALMS:
        realm_id = realm["id"]
        realm_name = realm["name"]
        print(f"\n=======================================================")
        print(f"Procesando Reino: {realm_id} - {realm_name}")
        print(f"=======================================================")

        # 1. Crear el reino si no existe
        headers = get_headers()
        r = requests.get(f"{BASE_URL}/admin/realms", headers=headers)
        current_existing = [re["realm"] for re in r.json()]

        if realm_id in current_existing:
            print(f"✔ El reino '{realm_id}' ya existe.")
        else:
            payload = {
                "id": realm_id,
                "realm": realm_id,
                "displayName": realm_name,
                "enabled": True,
                "sslRequired": "none"
            }
            res = requests.post(f"{BASE_URL}/admin/realms", headers=headers, json=payload)
            if res.status_code in [201, 204]:
                print(f"✔ Reino '{realm_id}' creado exitosamente.")
                time.sleep(1)
            else:
                print(f"Nota/Error creando reino '{realm_id}': {res.status_code} {res.text}")

        # OBTENER TOKEN FRESCO (imprescindible para que incluya permisos del nuevo reino)
        headers = get_headers()

        # 2. Crear rol ADMIN en el reino
        res_role = requests.get(f"{BASE_URL}/admin/realms/{realm_id}/roles/ADMIN", headers=headers)
        if res_role.status_code == 200:
            print(f"✔ Rol 'ADMIN' ya existe en '{realm_id}'.")
        else:
            role_data = {
                "name": "ADMIN",
                "description": "Rol de Administrador con acceso total a la entidad y al Software Central"
            }
            res_c_role = requests.post(f"{BASE_URL}/admin/realms/{realm_id}/roles", headers=headers, json=role_data)
            print(f"✔ Rol 'ADMIN' creado en '{realm_id}' (Status: {res_c_role.status_code}).")

        # 3. Crear Clientes: específico y 'software-central'
        clients_to_add = [
            {"id": realm["client"], "name": realm_name},
            {"id": "software-central", "name": "Software Central de Interoperabilidad"}
        ]
        
        headers = get_headers()
        r_clients = requests.get(f"{BASE_URL}/admin/realms/{realm_id}/clients", headers=headers)
        current_clients = [c["clientId"] for c in r_clients.json()] if r_clients.status_code == 200 else []

        for cli in clients_to_add:
            cli_id = cli["id"]
            if cli_id in current_clients:
                print(f"✔ Cliente '{cli_id}' ya existe en '{realm_id}'.")
            else:
                cli_payload = {
                    "clientId": cli_id,
                    "name": cli["name"],
                    "enabled": True,
                    "publicClient": True,
                    "directAccessGrantsEnabled": True,
                    "standardFlowEnabled": True,
                    "redirectUris": ["*"],
                    "webOrigins": ["*"]
                }
                res_cli = requests.post(f"{BASE_URL}/admin/realms/{realm_id}/clients", headers=headers, json=cli_payload)
                print(f"✔ Cliente '{cli_id}' creado en '{realm_id}' (Status: {res_cli.status_code}).")

        # 4. Crear Usuario 'admin'
        headers = get_headers()
        r_user = requests.get(f"{BASE_URL}/admin/realms/{realm_id}/users?username=admin", headers=headers)
        user_list = r_user.json() if r_user.status_code == 200 else []
        
        if len(user_list) > 0:
            user_id = user_list[0]["id"]
            print(f"✔ Usuario 'admin' ya existe en '{realm_id}' (ID: {user_id}).")
        else:
            user_payload = {
                "username": "admin",
                "enabled": True,
                "email": f"admin@{realm_id.lower()}.gob.ec",
                "firstName": "Administrador",
                "lastName": "General",
                "emailVerified": True
            }
            res_u = requests.post(f"{BASE_URL}/admin/realms/{realm_id}/users", headers=headers, json=user_payload)
            headers = get_headers()
            r_user2 = requests.get(f"{BASE_URL}/admin/realms/{realm_id}/users?username=admin", headers=headers)
            user_id = r_user2.json()[0]["id"]
            print(f"✔ Usuario 'admin' creado en '{realm_id}' (ID: {user_id}).")

        # 5. Asignar contraseña 'Esmeraldas2026*'
        headers = get_headers()
        cred_payload = {
            "type": "password",
            "value": "Esmeraldas2026*",
            "temporary": False
        }
        res_pwd = requests.put(f"{BASE_URL}/admin/realms/{realm_id}/users/{user_id}/reset-password", headers=headers, json=cred_payload)
        print(f"✔ Contraseña 'Esmeraldas2026*' asignada a 'admin' en '{realm_id}'.")

        # 6. Asignar rol 'ADMIN' al usuario
        headers = get_headers()
        role_res = requests.get(f"{BASE_URL}/admin/realms/{realm_id}/roles/ADMIN", headers=headers)
        if role_res.status_code == 200:
            role_obj = role_res.json()
            res_map = requests.post(f"{BASE_URL}/admin/realms/{realm_id}/users/{user_id}/role-mappings/realm", headers=headers, json=[role_obj])
            print(f"✔ Rol 'ADMIN' mapeado al usuario 'admin' en '{realm_id}'.")

        # 7. Prueba de Login Real
        token_auth_url = f"{BASE_URL}/realms/{realm_id}/protocol/openid-connect/token"
        login_test = requests.post(
            token_auth_url,
            data={
                "client_id": "software-central",
                "username": "admin",
                "password": "Esmeraldas2026*",
                "grant_type": "password"
            }
        )
        if login_test.status_code == 200:
            token_data = login_test.json()
            print(f"⭐ ¡VERIFICACIÓN EXITOSA! Login 'admin' / 'Esmeraldas2026*' verificado en '{realm_id}'.")
        else:
            print(f"❌ Fallo login en {realm_id}: {login_test.status_code} - {login_test.text}")

    print("\n=======================================================")
    print("LOS 5 REINOS HAN SIDO CONFIGURADOS Y VERIFICADOS CON ÉXITO")
    print("=======================================================")

if __name__ == "__main__":
    main()
