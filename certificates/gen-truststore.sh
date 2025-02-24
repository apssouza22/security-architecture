SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd ${SCRIPT_DIR} # enable calling this script from any directory

keytool -importcert -alias $1 -file gen/$1/service.crt -keystore gen/truststore.p12 -storetype PKCS12 -storepass changeit -noprompt
