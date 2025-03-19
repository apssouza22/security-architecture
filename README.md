# Security Architecture
This project demonstrates how to integrate several security mechanisms and technologies to tackle common security challenges such as authentication, authorization, and secure communication.

Watch the [video](https://youtu.be/XaDp3lyHUJc) for a detailed explanation of the project.

### Understanding Security Challenges in Distributed Systems

Distributed systems involve multiple services or microservices that must communicate securely across a network. Key security challenges in such architectures include:

2. **Authentication:** Verifying the identities of users and services to prevent unauthorized access.
3. **Authorization:** Controlling what authenticated users and services are allowed to do, based on their roles and permissions.
1. **Secure Communication:** Ensuring that data transmitted between services is encrypted and safe from eavesdropping or tampering.
4. **Policy Enforcement:** Implementing fine-grained access controls and policies that govern service-to-service and user interactions.
5. **Certificate Management:** Managing digital certificates for encrypting data and establishing trust between services.
6. **Web Application Firewall (WAF):** Protecting services from common web application attacks such as SQL injection, cross-site scripting (XSS), and DDoS attacks.


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
- Go to [Login page](https://localhost:8443/login)
- See the `authn.js` file in the `nginx/njs` directory to learn more.


### Client credentials
We have created a client credentials client in the keycloak to demonstrate how to authenticate using client credentials.
This type of client is used to authenticate services.

Create a token using client credentials to authenticate services.
```
curl -s --insecure --cert certificates/gen/serviceA/service.crt --key certificates/gen/serviceA/service.key \
 -X POST "https://localhost:8443/token" \
 -d "grant_type=client_credentials" \
 -d "client_id=client_credentials-test" \
 -d "client_secret=your-client-secret-here"
```

## Secure Communication
Secure communication is done using mutual TLS with Nginx acting as sidecar proxy for services.
The services communicate with each other using HTTPS with mutual TLS. The services present their certificates to Nginx, which verifies the certificates 
to validate the identity of clients and servers by checking the certificates against a Certificate Authority(CA).
```
# Validating the server identity
curl --cacert /etc/nginx/certs/ca.crt https://serviceA.local

# Validating the client and the server identity 
curl --cacert /etc/nginx/certs/ca.crt https://serviceA.local --cert /etc/nginx/certs/service.crt --key /etc/nginx/certs/service.key
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
We provide three strategies to validate JWT tokens:
- Retrieve the certs from the IDP (Keycloak) server and validate the token
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
## Update cert
curl -X POST --header "Authorization: $token" --insecure --cacert certificates/gen/ca.crt --cert certificates/gen/serviceA/service.crt --key certificates/gen/serviceA/service.key https://localhost:8003/certs -F cert=@certificates/gen/serviceA/service.crt -F key=@certificates/gen/serviceA/service.key

## Get cert
curl --header "Authorization: $token"  --insecure  --cacert certificates/gen/ca.crt --cert certificates/gen/serviceA/service.crt --key certificates/gen/serviceA/service.key https://localhost:8003/certs
```


## Web application firewall(WAF)
The project uses Nginx as a reverse proxy and web application firewall(WAF) to secure the services.
We also leverage the OWASP ModSecurity Core Rule Set(CRS) to protect the services from common web application attacks.
Here some requests that will be blocked by the WAF:
```
#XSS
curl http://localhost:8001/?param="><script>alert(1);</script>"
#SQLI - ?id=1' OR '1'='1" 
curl -X GET "http://localhost:8001/?id=1%27%20OR%20%271%27\=%271"
#Scanner/Bot Detection
curl --request GET  --url http://localhost:8001/   --header 'User-Agent: nmap'
# Remote Code Execution
curl -X GET "http://localhost:8001/?q=;cat%20/etc/passwd"
#Local File Inclusion
curl -X GET "http://localhost:8001/?file=../../../../etc/passwd"
XML External Entity
curl -X POST "http://localhost:8001" -d '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE data [<!ENTITY file SYSTEM "file:///etc/passwd">]><data>&file;</data>'
DDoS
curl -X POST "http://localhost:8001" -d "$(head -c 1000000 </dev/urandom)"
```

