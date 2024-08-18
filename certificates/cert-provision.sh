SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd ${SCRIPT_DIR} # enable calling this script from any directory
echo "Current directory: $(pwd)"

# This should be kept offline and secure and restricted access
./gen-ca.sh

# This is service responsible keep them secure
./gen-svc-cert.sh serviceA
./gen-svc-cert.sh serviceB
./gen-svc-cert.sh serviceC
echo "Certificates generated successfully"
