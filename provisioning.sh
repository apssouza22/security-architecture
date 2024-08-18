SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd ${SCRIPT_DIR} # enable calling this script from any directory
echo "Current directory: $(pwd)"

./certificates/gen-ca.sh
./certificates/gen-svc-cert.sh serviceA
./certificates/gen-svc-cert.sh serviceB
./certificates/gen-svc-cert.sh serviceC
echo "Certificates generated successfully"

./nginx/gen-nginx-conf.sh serviceA
./nginx/gen-nginx-conf.sh serviceB
./nginx/gen-nginx-conf.sh serviceC
echo "Service authz files generated successfully"
