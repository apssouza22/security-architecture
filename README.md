# Security Architecture
This project is a demonstration of how to secure services using different security mechanisms. 
We leverage the following technologies to secure services:
- Mutual TLS
- Keycloak
- Open Policy Agent(OPA)
- Nginx
- Client certificates
- OpenID Connect
- JWT

## Certificate management
The project uses a self-signed certificate authority to generate certificates for services. 
The certificates are generated using the `./provisioning.sh` script. The certificates are generated in the `certificates/gen` directory.

### Calling services with certificates
From the host machine, you can call the service using the following command:
```
curl --insecure  --cacert certificates/gen/ca.crt --cert certificates/gen/serviceA/client.crt --key certificates/gen/serviceA/client.key https://localhost
```
Inside the container, you can call the service using the following command:
```
curl --insecure  --cacert /etc/nginx/certs/ca.crt --cert /etc/nginx/certs/client.crt --key /etc/nginx/certs/client.key https://serviceB.local
```

## Update certificates
Server certificates can be update without restarting the service by running the following command:
```
curl --insecure  https://localhost/certs --cacert certificates/gen/ca.crt --cert certificates/gen/serviceB/client.crt --key certificates/gen/serviceB/client.key -F cert=@certificates/gen/serviceA/client.crt -F key=@certificates/gen/serviceA/client.key
```

## Authentication
Authentication is done using Keycloak. The Keycloak client is defined in the realm `tenantA`. 

Keycloak Console URL: http://localhost:9000 - credential: admin/password

### Keycloak URLs
Go to Login page-  http://127.0.0.1:9000/realms/tenantA/protocol/openid-connect/auth?scope=openid&response_type=code&client_id=appTest-login-client&redirect_uri=http://localhost:8002/auth_redirect&client_secret=vCjAY0XKadXE3n4xFUb7MGDvVJ1iVVPY&application_type=web_app

Retrieve Token with code
```
code=79e6cb5e-8ed0-4d79-b16a-ba413628edda.2df791ad-456b-401f-a209-e2bca7f391a3.808dd751-6494-4182-95ce-c7e7dfa0c0cc 
curl -X POST "http://localhost:9000/realms/tenantA/protocol/openid-connect/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code&code=${code}&redirect_uri=http://localhost:8002/auth_redirect&client_id=appTest-login-client&client_secret=vCjAY0XKadXE3n4xFUb7MGDvVJ1iVVPY"
