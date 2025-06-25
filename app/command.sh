#!/bin/bash

iptables -t nat -A OUTPUT -p tcp --dport 80 -j DNAT --to-destination 127.0.0.1:81
iptables -t nat -A POSTROUTING -j MASQUERADE

/docker-entrypoint.sh nginx
echo "**** Started nginx ****"

# Start the node process
node /app/server.js &
echo "**** Started app ****"

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
