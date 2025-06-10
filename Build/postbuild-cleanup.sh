#!/bin/bash
# Remove extra src/index.html from dist after Vite build 
cp -f ./dist/src/index.html ./dist/index.html
rm -f ./dist/src/index.html
rmdir --ignore-fail-on-non-empty ./dist/src
