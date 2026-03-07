Step-by-Step Server Deployment
Assumes Ubuntu 22.04 VPS. Run all commands as a non-root sudo user.

Step 1 — Server prerequisites

# Update system

sudo apt update && sudo apt upgrade -y

# Install Node.js 20

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally

sudo npm install -g pm2

# Install Docker (for Postgres + Redis)

sudo apt install -y docker.io docker-compose
sudo systemctl enable docker
sudo usermod -aG docker $USER
newgrp docker # apply group change without logout

# Install Nginx

sudo apt install -y nginx

# Install Certbot (for HTTPS)

sudo apt install -y certbot python3-certbot-nginx
Step 2 — Point your domain to the server
In your DNS provider, create these A records pointing to your server IP:

Record Value
api.yourdomain.com your-server-ip
app.yourdomain.com your-server-ip
Wait a few minutes for DNS to propagate before Step 6.

Step 3 — Clone and install

cd /home/$USER
git clone https://github.com/YOUR_USERNAME/Meeter.git
cd Meeter

# Install API + worker dependencies

npm install

# Install dashboard dependencies

cd dashboard && npm install && npm run build
cd ..
Step 4 — Start Postgres + Redis via Docker

# Start containers

docker-compose up -d

# Verify both are running

docker-compose ps

# Apply DB schema (first time only)

docker exec -i $(docker ps -qf "name=postgres") \
 psql -U postgres -d meeting_agent < db/schema.sql

# Verify tables were created

docker exec -it $(docker ps -qf "name=postgres") \
 psql -U postgres -d meeting_agent -c "\dt"
Step 5 — Create .env

nano /home/$USER/Meeter/.env
Paste and fill in every value:

# Google Meet (not used, Recall handles it)

GOOGLE_SERVICE_ACCOUNT_PATH=./credentials/google-service-account.json
GOOGLE_DELEGATED_EMAIL=admin@yourcompany.com

# Zoom (not used, Recall handles it)

ZOOM_SDK_KEY=unused
ZOOM_SDK_SECRET=unused

# Deepgram (not used, Recall handles transcription)

DEEPGRAM_API_KEY=unused

# OpenAI — Agent Brain + TTS

OPENAI_API_KEY=sk-proj-...

# Database — Docker containers

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/meeting_agent
REDIS_URL=redis://localhost:6379

# Auth

CLERK*SECRET_KEY=sk_live*...
CLERK*PUBLISHABLE_KEY=pk_live*...
NEXT*PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live*...

# Stripe (fill when ready, leave placeholder for now)

STRIPE*SECRET_KEY=sk_live*...
STRIPE*WEBHOOK_SECRET=whsec*...

# Integrations (fill when users connect OAuth)

JIRA_CLIENT_ID=
JIRA_CLIENT_SECRET=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=

# Recall.ai — get from app.recall.ai

RECALL_API_KEY=your_recall_api_key_here
RECALL_REGION=us-west-2

# App URLs — replace with your actual domains

API_URL=https://api.yourdomain.com
DASHBOARD_URL=https://app.yourdomain.com
NODE_ENV=production
PORT=3001
BOT_DISPLAY_NAME=Aria (AI Assistant)
Create the dashboard env:

nano /home/$USER/Meeter/dashboard/.env.local

NEXT*PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live*...
CLERK*SECRET_KEY=sk_live*...
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
Step 6 — Configure Nginx

sudo nano /etc/nginx/sites-available/meeter
Paste:

# API Server

server {
server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

}

# Dashboard

server {
server_name app.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

}

# Enable the config

sudo ln -s /etc/nginx/sites-available/meeter /etc/nginx/sites-enabled/
sudo nginx -t # verify no errors
sudo systemctl reload nginx
Step 7 — SSL certificates

sudo certbot --nginx -d api.yourdomain.com -d app.yourdomain.com

# Follow prompts — choose to redirect HTTP → HTTPS

Step 8 — Start all processes with PM2

cd /home/$USER/Meeter

# Start everything

pm2 start ecosystem.config.js

# Check all 3 are running

pm2 status

# Save so PM2 restarts on server reboot

pm2 save
pm2 startup # run the output command it gives you
Step 9 — Verify

# API health check

curl https://api.yourdomain.com/health

# Expected: {"status":"ok","timestamp":"..."}

# Check logs

pm2 logs api # API server logs
pm2 logs worker # Worker logs
pm2 logs dashboard
Visit https://app.yourdomain.com — you should see the Aria landing page.

Step 10 — Set Recall.ai webhook URLs
Log into app.recall.ai → Settings and confirm your webhook endpoints are reachable:

https://api.yourdomain.com/webhooks/recall/transcript
https://api.yourdomain.com/webhooks/recall/status
These are set automatically per-bot when you create a meeting — just confirm API_URL in .env is correct.

Useful commands going forward

pm2 restart all # restart everything after code changes
pm2 logs # tail all logs
pm2 logs api --lines 100 # last 100 lines from API

# Pull latest code and restart

cd /home/$USER/Meeter
git pull
npm install
cd dashboard && npm run build && cd ..
pm2 restart all
