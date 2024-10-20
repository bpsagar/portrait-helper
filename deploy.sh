#!/bin/bash

set -e

npm run build && \
  tar -cvf ./deploy.tar --exclude='*.map' ./nginx.conf ./captain-definition ./out/* && \
  caprover deploy -t ./deploy.tar
