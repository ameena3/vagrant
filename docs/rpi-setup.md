# Raspberry Pi 3 B+ Deployment

## Prerequisites

- Raspberry Pi 3 B+ with SD card (16GB+)
- Raspberry Pi OS Lite 64-bit (flash via [Raspberry Pi Imager](https://www.raspberrypi.com/software/))
- Private Docker registry accessible from both Mac and RPi

## 1. Flash OS

Use Raspberry Pi Imager to flash **Raspberry Pi OS Lite (64-bit)**. In the advanced settings:
- Enable SSH
- Set hostname (e.g. `freshkitchen`)
- Set username/password

## 2. Configure Swap (critical for 1GB RAM)

```bash
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

Verify: `free -h` should show 2GB swap.

## 3. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in for group change to take effect
```

Docker Compose v2 is included with modern Docker — no separate install needed.

## 4. Configure Registry Access

If using an insecure (HTTP) private registry on your local network:

```bash
sudo tee /etc/docker/daemon.json <<EOF
{
  "insecure-registries": ["<registry-host>:<port>"]
}
EOF
sudo systemctl restart docker
```

## 5. Deploy

### On your Mac (build and push):

```bash
# One-time: set up buildx
make buildx-setup

# Build ARM64 images and push to registry
make buildx-all REGISTRY=<your-registry>
```

### On the RPi:

```bash
mkdir -p ~/freshkitchen && cd ~/freshkitchen
```

Copy files from Mac:
```bash
# Run on Mac:
scp docker-compose.rpi.yml .env pi@freshkitchen.local:~/freshkitchen/
scp -r mongo-init pi@freshkitchen.local:~/freshkitchen/
```

Pull and start:
```bash
cd ~/freshkitchen
export REGISTRY=<your-registry>
docker compose -f docker-compose.rpi.yml pull
docker compose -f docker-compose.rpi.yml up -d
```

## 6. Verify

```bash
# Check containers are running
docker compose -f docker-compose.rpi.yml ps

# Check memory usage
docker stats --no-stream

# Health check
curl http://localhost:8080/health
```

Browse to `http://freshkitchen.local:3000`.

## Memory Budget

| Service  | Limit | Notes                          |
|----------|-------|--------------------------------|
| Frontend | 256M  | Node.js heap capped at 200MB   |
| Backend  | 128M  | Go binary, very lightweight    |
| MongoDB  | 384M  | WiredTiger cache capped at 256MB |
| OS       | ~256M | Headless RPi OS Lite           |
| **Total**| ~1GB  | 2GB swap provides safety net   |

## Troubleshooting

**MongoDB OOM-killed**: Reduce WiredTiger cache — edit `docker-compose.rpi.yml`, change `--wiredTigerCacheSizeGB 0.25` to `0.15`.

**Frontend OOM-killed**: Reduce Node.js heap — change `NODE_OPTIONS=--max-old-space-size=200` to `150`.

**Still too tight**: Move MongoDB off the Pi — use [MongoDB Atlas free tier](https://www.mongodb.com/cloud/atlas) and update `MONGO_URI` in `.env`. This frees ~384MB on the Pi.

**Fallback MongoDB version**: If `mongo:7` is too heavy, try `mongo:4.4` which has a smaller footprint and still supports ARM64.
