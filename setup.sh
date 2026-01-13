#!/bin/bash

if [ ! -f ".env" ]; then
    ln -s "$HOME/Desktop/.env" ".env"
fi

if [ ! -d "certs" ]; then
    ln -s "$HOME/Desktop/certs" "certs"
fi

npm install dotenv