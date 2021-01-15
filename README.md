# awas-banjir-cloud

IoT Gateway and Logger for Flood Monitoring System

## Setup Web Admin UI

Go to `admin/` directory, install and build front-end codes.

```sh
cd admin
yarn install
yarn build
cd ..
```

Directory `admin/dist/` will be generated containing all front-end production resources.

## Setup IoT Platform

Go to `server/` directory and install all dependencies.

```sh
cd server
yarn install
```

Get your Firebase Admin SDK Credentials and save it in `server/fcm-key.json`.

Create a `server/.env` file with following contents:

```txt
PORT=8080
HOST=127.0.0.1
MONGO_URL=mongodb://localhost:27017
MONGO_DB=awasbanjir
APP_SECRET=random123
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
```

## Run IoT Platform

Run `index.js` in `server/` and `cron-aweek-aggregate.js` in `server/scripts/` with PM2.

```sh
cd server
pm2 start index.js
cd scripts
pm2 start cron-aweek-aggregate.js
cd ../..
```

## Setup Nginx

Create `yourdomain.com.conf` file in `/etc/nginx/sites-available/` with following contents:

```txt
server {
    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    listen 80;

    listen 443 ssl; # remove this line if you want to generate it with certbot
    ssl_certificate /path-to-fullchain.pem;  # remove this line if you want to generate it with certbot
    ssl_certificate_key /path-to-private-key.pem;  # remove this line if you want to generate it with certbot
}
```

Create a symbolic link of that file to `/etc/nginx/sites-enabled` directory, test your nginx configuration and reload nginx.

```sh
ln -s /etc/nginx/sites-available/yourdomain.com.conf /etc/nginx/sites-enabled/yourdomain.com.conf
nginx -t
systemctl reload nginx
```

## Domain DNS Config

Go to your domain provider, and create **A** record with your domain (or subdomain) in the DNS config pointing to your server IP address.

## Install Utility Toolkit

Go to `utils/` and run:

```sh
yarn global add $PWD
```

## Maintainer

Iqbal Mohammad Abdul Ghoni / [Arsfiqball](https://github.com/Arsfiqball)
