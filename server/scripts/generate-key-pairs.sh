# Generate key pairs with ECDSA 256
# Please copy the key pairs elsewhere after it's generated

# Generate private key
openssl ecparam -name prime256v1 -genkey -noout -out private-key.pem

# Generate public key
openssl ec -in private-key.pem -pubout -out public-key.pem
