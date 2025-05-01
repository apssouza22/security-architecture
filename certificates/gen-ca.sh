SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd ${SCRIPT_DIR} # enable calling this script from any directory

# Script to generate a CA and service certificate and key
rm -rf "gen"
mkdir "gen"
mkdir -p "gen/protected"

## Generate Root CA Identity CA and Private Key
## A root certificate is a self-signed certificate used to identify the Root Certificate Authority (CA).
## The root certificate is the top-most certificate of the tree, the private key of which is used to sign other certificates.
## The root certificate is used to sign the intermediate certificate, which is then used to sign the service certificate.
## Keep the root certificate offline and secure.
openssl genrsa -out gen/protected/rootCA.key 4096
openssl req -x509 -new -nodes -config root_config.cnf -key gen/protected/rootCA.key -sha256 -days 3650 -out gen/protected/rootCA.pem

## Generate Private Key and certificate signing request (CSR) for Intermediary CA
openssl genrsa -out gen/protected/intermediateCA.key 4096 # private key
openssl req -new -config ca_config.cnf -key gen/protected/intermediateCA.key -out gen/protected/intermediateCA.csr

# This process should be offline
# The intermediate CA is signed by the root CA, which is used to sign the service certificate.
openssl x509 -req -in gen/protected/intermediateCA.csr -CA gen/protected/rootCA.pem -CAkey gen/protected/rootCA.key -CAcreateserial -out gen/protected/intermediateCA.pem -days 365 -sha256  -extfile ca_config.cnf -extensions v3_ca

## Generate Full Chain Certificate
cat gen/protected/intermediateCA.pem gen/protected/rootCA.pem > gen/ca.crt
