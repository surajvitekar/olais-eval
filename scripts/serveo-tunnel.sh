#!/bin/bash
stdbuf -oL ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -o ExitOnForwardFailure=yes -R 80:localhost:80 serveo.net 2>&1
