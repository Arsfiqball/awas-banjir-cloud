#!/bin/bash

for i in 100 200 300 400 500
do
  node bot clear --server http://10.42.0.1:8080 --secret-key skripsikomputer2;
  node bot create --server http://10.42.0.1:8080 --secret-key skripsikomputer2 $i;
  node bot attack-hit --server http://10.42.0.1:8080 --secret-key skripsikomputer2 $i 1;
  echo "Done $i";
  sleep 5;
done
