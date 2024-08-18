SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd ${SCRIPT_DIR} # enable calling this script from any directory

# Read the nginx.conf file and replace the placeholder with the actual service name
NGINX_CONF=$(cat nginx.conf)
NGINX_CONF="${NGINX_CONF//SERVICE_NAME/$1.local}"

mkdir -p "gen/$1"
echo "$NGINX_CONF" > "gen/$1/nginx.conf"
echo "Nginx configuration generated successfully"