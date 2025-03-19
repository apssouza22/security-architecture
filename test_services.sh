SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd ${SCRIPT_DIR} # enable calling this script from any directory
echo "Current directory: $(pwd)"

if ! command -v jq &> /dev/null
then
    echo "jq could not be found. Please install jq to proceed."
    exit 1
fi

# Retrieve access token for the client credentials grant type
access_token_response=$(curl -s --insecure --cert certificates/gen/serviceA/service.crt --key certificates/gen/serviceA/service.key \
                              -X POST "https://localhost:8443/token" \
                             -d "grant_type=client_credentials" \
                             -d "client_id=client_credentials-test" \
                             -d "client_secret=your-client-secret-here")

token=$(echo $access_token_response | jq -r '.access_token')
echo "Access token: $token"

# Mutual TLS communication between services
SERVICEA_SERVICEB=$(docker exec security-arch-serviceA-1 curl -s -o /dev/null -w "%{http_code}" --header "Authorization: $token" --cacert /etc/nginx/certs/ca.crt --cert /etc/nginx/certs/service.crt --key /etc/nginx/certs/service.key https://serviceB.local)
SERVICEA_SERVICEC=$(docker exec security-arch-serviceA-1 curl -s -o /dev/null -w "%{http_code}" --header "Authorization: $token" --cacert /etc/nginx/certs/ca.crt --cert /etc/nginx/certs/service.crt --key /etc/nginx/certs/service.key https://serviceC.local)
SERVICEB_SERVICEA=$(docker exec security-arch-serviceB-1 curl -s -o /dev/null -w "%{http_code}" --header "Authorization: $token" --cacert /etc/nginx/certs/ca.crt  --cert /etc/nginx/certs/service.crt --key /etc/nginx/certs/service.key https://serviceA.local)
SERVICEB_SERVICEA_NO_CA=$(docker exec security-arch-serviceB-1 curl -s -o /dev/null -w "%{http_code}" --header "Authorization: $token" --cert /etc/nginx/certs/service.crt --key /etc/nginx/certs/service.key https://serviceA.local)
SERVICEB_SERVICEA_NO_CERT=$(docker exec security-arch-serviceB-1 curl -s -o /dev/null -w "%{http_code}" --header "Authorization: $token" --insecure   https://serviceA.local)
SERVICEB_SERVICEC=$(docker exec security-arch-serviceB-1 curl -s -o /dev/null -w "%{http_code}" --header "Authorization: $token" --cacert /etc/nginx/certs/ca.crt --cert /etc/nginx/certs/service.crt --key /etc/nginx/certs/service.key https://serviceC.local)
SERVICEC_SERVICEB=$(docker exec security-arch-serviceC-1 curl -s -o /dev/null -w "%{http_code}" --header "Authorization: $token" --cacert /etc/nginx/certs/ca.crt  --cert /etc/nginx/certs/service.crt --key /etc/nginx/certs/service.key https://serviceA.local)
SERVICEC_SERVICEA=$(docker exec security-arch-serviceC-1 curl -s -o /dev/null -w "%{http_code}" --header "Authorization: $token" --cacert /etc/nginx/certs/ca.crt  --cert /etc/nginx/certs/service.crt --key /etc/nginx/certs/service.key https://serviceB.local)
SERVICEA_PROXY_SERVICEB=$(docker exec security-arch-serviceA-1 curl -s -o /dev/null -w "%{http_code}" --header "Authorization: $token" http://serviceB.local)

LOCAL_GTW=$(curl -s -o /dev/null -w "%{http_code}" --header "Authorization: $token"  --insecure  --cacert certificates/gen/ca.crt --cert certificates/gen/serviceA/service.crt --key certificates/gen/serviceA/service.key https://localhost:8443)
UPDATE_CERT=$(curl -s -o /dev/null -w "%{http_code}" --header "Authorization: $token"  --insecure  --cacert certificates/gen/ca.crt --cert certificates/gen/serviceA/service.crt --key certificates/gen/serviceA/service.key https://localhost:8003/certs -F cert=@certificates/gen/serviceA/service.crt -F key=@certificates/gen/serviceA/service.key)


echo "Local -> Auth Gateway: $LOCAL_GTW"
echo "Local -> UPDATE_CERT = $UPDATE_CERT, Expected = 201"
echo "ServiceA -> SIDECAR_PROXY -> ServiceB: Actual = $SERVICEA_PROXY_SERVICEB, Expected = 200"

echo "ServiceA -> ServiceB: Actual = $SERVICEA_SERVICEB, Expected = 200"
echo "ServiceC -> ServiceB: Actual = $SERVICEC_SERVICEB, Expected = 200"
echo "ServiceC -> ServiceA: Actual = $SERVICEC_SERVICEA, Expected = 200"
echo "ServiceB -> ServiceA: Actual = $SERVICEC_SERVICEA, Expected = 200"
echo "ServiceB -> ServiceA: Actual = $SERVICEB_SERVICEA_NO_CERT, Expected = 400 - Not sent cert"
echo "ServiceB -> ServiceA: Actual = $SERVICEB_SERVICEA_NO_CA, Expected = 400 - Not sent ca cert"
echo "ServiceB -> ServiceC: Actual = $SERVICEB_SERVICEC, Expected = 403 - Policy enforcement"
echo "ServiceA -> ServiceC: Actual = $SERVICEA_SERVICEC, Expected = 403 - Policy enforcement"
