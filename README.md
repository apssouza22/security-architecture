# Security Architecture
This project demonstrates how to integrate several security mechanisms and technologies to tackle common security challenges such as authentication, authorization, and secure communication.


### Understanding Security Challenges in Distributed Systems

Distributed systems involve multiple services or microservices that must communicate securely across a network. Key security challenges in such architectures include:

1. **Secure Communication:** Ensuring that data transmitted between services is encrypted and safe from eavesdropping or tampering.
2. **Authentication:** Verifying the identities of users and services to prevent unauthorized access.
3. **Authorization:** Controlling what authenticated users and services are allowed to do, based on their roles and permissions.
4. **Policy Enforcement:** Implementing fine-grained access controls and policies that govern service-to-service and user interactions.
5. **Certificate Management:** Managing digital certificates for encrypting data and establishing trust between services.


<img src="./arch.jpg">

## Setup
- `./provisioning.sh`
- `docker-compose up`


## Authentication
Authentication is done using [Keycloak](https://www.keycloak.org/). The Keycloak clients are defined in the realm file inside `keycloak/`. 

Two clients are defined:
- `appTest-login-client` - This client is used to authenticate users using OpenID Connect
- `client_credentials-test` - This client is used to authenticate services using client credentials

Keycloak Console URL: http://localhost:9000 - credential: admin/password

### Authentication flow (Keycloak)
- Go to [Login page](http://127.0.0.1:9000/realms/tenantA/protocol/openid-connect/auth?scope=openid&response_type=code&client_id=appTest-login-client&redirect_uri=http://localhost:8002/auth_redirect&client_secret=vCjAY0XKadXE3n4xFUb7MGDvVJ1iVVPY&application-type=web_app)
- After login, the user will be redirected to a callback page with an authorization code which can be used to retrieve a Jwt token.
- Retrieve the token using the authorization code:
```bash
curl -X POST "http://localhost:9000/realms/tenantA/protocol/openid-connect/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code" \
     -d "client_id=appTest-login-client" \
     -d "client_secret=vCjAY0XKadXE3n4xFUb7MGDvVJ1iVVPY" \
     -d "code=30810f49-0738-46f4-89d0-1f93813e59e0.6f1953b4-e26a-44f4-a5d3-707566026bf5.4125bbf1-cab2-4b97-9538-7f1882b401fe" \
     -d "redirect_uri=http://localhost:8002/auth_redirect"
```
- See the `authn.js` file in the `nginx/njs` directory to learn more.


### Client credentials
We created a client credentials client in the keycloak to demonstrate how to authenticate using client credentials.
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
We offer two types of authorization:
- Service-to-service authorization
- User access control

### Service-to-service authorization
Service-to-service authorization is performed in two levels:
- Service-to-service communication using mutual TLS with Nginx
- Service access control using [Open Policy Agent(OPA)](https://www.openpolicyagent.org/)

### User access control
User access control is done using JWT tokens.
We use three strategies to validate JWT tokens:
- Retrieve the certs from the Keycloak server and validate the token
- Use x5t(Thumbprint) embedded in the token to retrieve the public key from a local truststore and validate the token
- Using embedded certificate to validate the token after validating the certificate against a CA

See the `nginx/njs/token.js`

### OPA
The OPA policies are defined in the `opa/` directory.
OPA is used to enforce policies for service-to-service communication and for user access control.

## Certificate management
The project uses shell script to simulate the certificate authority and generate certificates for services.
The certificates are generated using the `./provisioning.sh` script. The certificates are generated in the `certificates/gen` directory.

### Calling services with certificates
To test the service to service communication using certificates, you can use the `test_services.sh` script.


### Update certificates
Server certificates can be updated without restarting the service by running the following command:
```
curl --insecure  https://localhost/certs --cacert certificates/gen/ca.crt --cert certificates/gen/serviceB/client.crt --key certificates/gen/serviceB/client.key -F cert=@certificates/gen/serviceA/client.crt -F key=@certificates/gen/serviceA/client.key
```

## Local DNS
The project uses a local DNS server to resolve the service names to the IP addresses of the services. 
This was required for nginx to resolve the service names when using dynamic upstream urls. 