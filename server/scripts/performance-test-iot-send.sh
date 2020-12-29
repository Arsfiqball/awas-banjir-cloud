#!/bin/bash

for i in 20 40 60 80 100
do
  node bot clear --server http://10.42.0.1:8080 --secret-key skripsikomputer2;
  node bot create --server http://10.42.0.1:8080 --secret-key skripsikomputer2 $i;
  sleep 5;
  node bot attack-hit --server http://10.42.0.1:8080 --secret-key skripsikomputer2 $i 1;
  echo "Done $i";
  sleep 5;
done

for i in 120 140 160 180 200
do
  node bot clear --server http://10.42.0.1:8080 --secret-key skripsikomputer2;
  node bot create --server http://10.42.0.1:8080 --secret-key skripsikomputer2 $i;
  sleep 5;
  node bot attack-hit --server http://10.42.0.1:8080 --secret-key skripsikomputer2 $i 1;
  echo "Done $i";
  sleep 5;
done
