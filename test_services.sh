SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd ${SCRIPT_DIR} # enable calling this script from any directory
echo "Current directory: $(pwd)"

SERVICEA_SERVICEB=$(docker exec security-arch-serviceA-1 curl -s -o /dev/null -w "%{http_code}" --insecure  --cert /etc/nginx/certs/client.crt --key /etc/nginx/certs/client.key https://serviceB.local)
SERVICEA_SERVICEC=$(docker exec security-arch-serviceA-1 curl -s -o /dev/null -w "%{http_code}" --insecure  --cert /etc/nginx/certs/client.crt --key /etc/nginx/certs/client.key https://serviceC.local)
SERVICEB_SERVICEA=$(docker exec security-arch-serviceB-1 curl -s -o /dev/null -w "%{http_code}" --insecure  --cert /etc/nginx/certs/client.crt --key /etc/nginx/certs/client.key https://serviceA.local)
SERVICEB_SERVICEC=$(docker exec security-arch-serviceB-1 curl -s -o /dev/null -w "%{http_code}" --insecure  --cert /etc/nginx/certs/client.crt --key /etc/nginx/certs/client.key https://serviceC.local)
SERVICEC_SERVICEB=$(docker exec security-arch-serviceC-1 curl -s -o /dev/null -w "%{http_code}" --insecure  --cert /etc/nginx/certs/client.crt --key /etc/nginx/certs/client.key https://serviceA.local)
SERVICEC_SERVICEA=$(docker exec security-arch-serviceC-1 curl -s -o /dev/null -w "%{http_code}" --insecure  --cert /etc/nginx/certs/client.crt --key /etc/nginx/certs/client.key https://serviceB.local)
LOCAL_SERVICEA=$(curl -s -o /dev/null -w "%{http_code}" --insecure  --cacert certificates/gen/ca.crt --cert certificates/gen/serviceA/client.crt --key certificates/gen/serviceA/client.key https://localhost)

echo "Local -> ServiceA: $LOCAL_SERVICEA"
echo "ServiceA -> ServiceB: $SERVICEA_SERVICEB"
echo "ServiceB -> ServiceA: $SERVICEB_SERVICEA"
echo "ServiceC -> ServiceB: $SERVICEC_SERVICEB"
echo "ServiceC -> ServiceA: $SERVICEC_SERVICEA"
echo "ServiceB -> ServiceC: $SERVICEB_SERVICEC"
echo "ServiceA -> ServiceC: $SERVICEA_SERVICEC"



