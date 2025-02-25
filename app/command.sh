#!/bin/bash

iptables -t nat -A OUTPUT -p tcp --dport 80 -j DNAT --to-destination 127.0.0.1:81
iptables -t nat -A POSTROUTING -j MASQUERADE

# Start the nginx process
nginx -g 'daemon off;' &

# Start the node process
node /app/server.js &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
