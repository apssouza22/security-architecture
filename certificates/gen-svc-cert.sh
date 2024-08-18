SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd ${SCRIPT_DIR} # enable calling this script from any directory

rm -rf "gen/$1"
mkdir -p "gen/$1"

# Generate Service Certificate Configuration
CLIENT_CONF=$(cat client_config.cnf)
CLIENT_CONF="${CLIENT_CONF//SERVICE_NAME/$1.local}"

SVC_CONF=$(cat service_config.cnf)
SVC_CONF="${SVC_CONF//SERVICE_NAME/$1.local}"

echo "$CLIENT_CONF" > "gen/$1/client_config.cnf"
echo "$SVC_CONF" > "gen/$1/service_config.cnf"
echo "Service configuration generated successfully"


# Generate Service Certificate signed with Identity CA
openssl genrsa -out gen/$1/service.key 4096
openssl req -new -config gen/$1/service_config.cnf -key gen/$1/service.key -out gen/$1/service.csr
openssl x509 -req -in gen/$1/service.csr -CA gen/protected/intermediateCA.pem -CAkey gen/protected/intermediateCA.key -CAcreateserial -out gen/$1/service.crt -days 1024 -sha256  -extfile gen/$1/service_config.cnf # Generate a certificate


## Generate Client Certificate signed with Identity CA
openssl genrsa -out gen/$1/client.key 4096 # Generate a private key
openssl req -new -config gen/$1/client_config.cnf -key gen/$1/client.key -out gen/$1/client.csr # Generate a certificate signing request
openssl x509 -req -in gen/$1/client.csr  -CA gen/protected/intermediateCA.pem -CAkey gen/protected/intermediateCA.key -CAcreateserial -out gen/$1/client.crt -days 1024 -sha256  -extfile gen/$1/client_config.cnf -extensions v3_req # Generate a certificate

# Verify the certificates generated with the CA
openssl verify -CAfile gen/ca.crt gen/$1/service.crt
openssl verify -CAfile gen/ca.crt gen/$1/client.crt
