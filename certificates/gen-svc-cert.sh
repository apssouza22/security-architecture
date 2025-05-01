SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd ${SCRIPT_DIR} # enable calling this script from any directory

rm -rf "gen/$1"
mkdir -p "gen/$1"

echo "Generate Service Certificate Configuration"
SVC_CONF=$(cat service_config.cnf)
SVC_CONF="${SVC_CONF//SERVICE_NAME/$1.local}"

echo "$SVC_CONF" > "gen/$1/service_config.cnf"
echo "Service configuration generated successfully"

echo "Generating certificate signing request for $1"
openssl genrsa -out gen/$1/service.key 4096
openssl req -new -config gen/$1/service_config.cnf -key gen/$1/service.key -out gen/$1/service.csr

# ========================================== #
# Send the CSR to the CA for signing
# ========================================== #

echo "Received the CSRs. Signing certificates for $1"
openssl x509 -req -in gen/$1/service.csr -CA gen/protected/intermediateCA.pem -CAkey gen/protected/intermediateCA.key -CAcreateserial -out gen/$1/service.crt -days 365 -sha256  -extfile gen/$1/service_config.cnf # Generate a certificate

# ========================================== #
# Verify the certificates generated with the CA
# ========================================== #
echo "Verifying the certificates generated with the CA"
openssl verify -CAfile gen/ca.crt gen/$1/service.crt

echo "Certificates generated successfully for $1"
