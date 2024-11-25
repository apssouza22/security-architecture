SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd ${SCRIPT_DIR} # enable calling this script from any directory
echo "Current directory: $(pwd)"

if ! command -v jq &> /dev/null
then
    echo "jq could not be found. Please install jq to proceed."
    exit 1
fi

# Retrieve access token for the client credentials grant type
access_token_response=$(curl -s  -X POST "http://localhost:9000/realms/tenantA/protocol/openid-connect/token" \
                             -H "Content-Type: application/x-www-form-urlencoded" \
                             -d "grant_type=client_credentials" \
                             -d "client_id=client_credentials-test" \
                             -d "client_secret=your-client-secret-here")

token=$(echo $access_token_response | jq -r '.access_token')
#echo "Access token: $token"

# Mutual TLS communication between services
SERVICEA_SERVICEB=$(docker exec security-arch-serviceA-1 curl -s -o /dev/null -w "%{http_code}" --header "Authorization: $token" --insecure  --cert /etc/nginx/certs/client.crt --key /etc/nginx/certs/client.key https://serviceB.local)
SERVICEA_SERVICEC=$(docker exec security-arch-serviceA-1 curl -s -o /dev/null -w "%{http_code}" --header "Authorization: $token" --insecure  --cert /etc/nginx/certs/client.crt --key /etc/nginx/certs/client.key https://serviceC.local)
SERVICEB_SERVICEA=$(docker exec security-arch-serviceB-1 curl -s -o /dev/null -w "%{http_code}" --header "Authorization: $token" --insecure   https://serviceA.local)
SERVICEB_SERVICEC=$(docker exec security-arch-serviceB-1 curl -s -o /dev/null -w "%{http_code}" --header "Authorization: $token" --insecure  --cert /etc/nginx/certs/client.crt --key /etc/nginx/certs/client.key https://serviceC.local)
SERVICEC_SERVICEB=$(docker exec security-arch-serviceC-1 curl -s -o /dev/null -w "%{http_code}" --header "Authorization: $token" --insecure  --cert /etc/nginx/certs/client.crt --key /etc/nginx/certs/client.key https://serviceA.local)
SERVICEC_SERVICEA=$(docker exec security-arch-serviceC-1 curl -s -o /dev/null -w "%{http_code}" --header "Authorization: $token" --insecure  --cert /etc/nginx/certs/client.crt --key /etc/nginx/certs/client.key https://serviceB.local)

LOCAL_SERVICEA=$(curl -s -o /dev/null -w "%{http_code}" --header "Authorization: $token"  --insecure  --cacert certificates/gen/ca.crt --cert certificates/gen/serviceA/client.crt --key certificates/gen/serviceA/client.key https://localhost)
PROXY=$(curl -s -o /dev/null -w "%{http_code}" --header "Authorization: $token" http://localhost:8002/secure-proxy)

# This is enough to establish the TLS communication when we want to only verify the server identity. Not mutual TLS
# curl --cacert certificates/gen/ca.crt https://serviceA.local


echo "Local -> ServiceA: $LOCAL_SERVICEA"
echo "Local -> PROXY -> ServiceA: $PROXY"
echo "ServiceA -> ServiceB: Actual = $SERVICEA_SERVICEB, Expected = 200"
echo "ServiceB -> ServiceA: Actual = $SERVICEB_SERVICEA, Expected = 400"
echo "ServiceC -> ServiceB: Actual = $SERVICEC_SERVICEB, Expected = 200"
echo "ServiceC -> ServiceA: Actual = $SERVICEC_SERVICEA, Expected = 200"
echo "ServiceB -> ServiceC: Actual = $SERVICEB_SERVICEC, Expected = 403"
echo "ServiceA -> ServiceC: Actual = $SERVICEA_SERVICEC, Expected = 403"
