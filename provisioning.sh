SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd ${SCRIPT_DIR} # enable calling this script from any directory
echo "Current directory: $(pwd)"

echo "**** Create app image ****"
docker build -t app-example:latest ./app

echo "\n **** Generating Certificate Authority ****"
./certificates/gen-ca.sh

echo "\n **** Generating Service Certificates ****"
./certificates/gen-svc-cert.sh authn
./certificates/gen-svc-cert.sh serviceA
./certificates/gen-svc-cert.sh serviceB
./certificates/gen-svc-cert.sh serviceC

echo "\n **** Generating Truststore for Services ****"
./certificates/gen-truststore.sh authn
./certificates/gen-truststore.sh serviceA
./certificates/gen-truststore.sh serviceB
./certificates/gen-truststore.sh serviceC

echo "\n **** Certificates generated successfully ****"

./nginx/gen-nginx-conf.sh serviceA
./nginx/gen-nginx-conf.sh serviceB
./nginx/gen-nginx-conf.sh serviceC

echo "Sidecar conf files generated successfully"