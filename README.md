# Security Architecture
This project is a demonstration of how to secure services using different security mechanisms. 

We leverage the following technologies to secure services:
- Mutual TLS
- Keycloak
- Open Policy Agent(OPA)
- Nginx
- Client certificates authorization
- OpenID Connect
- JWT
- Service to service authentication(Client credentials)

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

### Update certificates
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
CODE=the returned code here
curl -X POST "http://localhost:9000/realms/tenantA/protocol/openid-connect/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code&code=${CODE}&redirect_uri=http://localhost:8002/auth_redirect&client_id=appTest-login-client&client_secret=vCjAY0XKadXE3n4xFUb7MGDvVJ1iVVPY"
```

### Client credentials
We created a client credentials client in the realm `tenantA` to demonstrate how to authenticate using client credentials.
This type of client is used to authenticate services.

Create a token using client credentials to authenticate services.
```
curl -X POST "http://localhost:9000/realms/tenantA/protocol/openid-connect/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=client_credentials" \
     -d "client_id=client_credentials-test" \
     -d "client_secret=your-client-secret-here"
```

## Authorization
Authorization is done using Open Policy Agent(OPA). The policy is defined in the `opa/` directory.
Opa is used to enforce policies for service-to-service communication and for user access control.

### JWT token validation
We use three strategies to validate JWT tokens:
- Retrieve the public key from the Keycloak server and validate the token
- Use x5t(Thumbprint) to retrieve the public key from a local truststore and validate the token
- Using embedded certificate to validate the token after validating the certificate against a CA

See the `nginx/njs/token.js`

