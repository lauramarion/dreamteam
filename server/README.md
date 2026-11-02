# Dream Team server

The backend for the Dream Team dashboard: a [PocketBase](https://pocketbase.io) database running in Docker on the OVH VPS, behind a Caddy proxy that handles HTTPS.

```
browser ──HTTPS──▶ Caddy (shared, server/proxy) ──▶ PocketBase (server/) ──▶ pb_data/data.db
```

- **PocketBase** stores readers, books and yearly goals, serves a public read API, and has an admin screen at `/_/`.
- **Caddy** is the single front door for every app on the VPS. It gets HTTPS certificates from Let's Encrypt by itself.
- **No logins.** People pick their name on the site. Any change needs the shared **group code** (sent as an `X-Group-Code` header). Reading needs nothing.

## What's in this folder

| Path | What it is |
|---|---|
| `Dockerfile` | Builds the PocketBase image. The PocketBase version is pinned here. |
| `docker-compose.yml` | Runs the Dream Team container. |
| `.env.example` | Template for the secret settings (the group code). |
| `pb_migrations/` | The database structure. Applied automatically when PocketBase starts. |
| `pb_hooks/` | Server-side rules: group-code check, invite logic, book checks. |
| `proxy/` | The shared Caddy proxy for all apps on the VPS. |
| `pb_data/` | Created on the server: the live database and backups. Never committed. |

## Data model

- **readers**: `name` (unique), `color` (`#rrggbb`), `emoji`, `goodreads_url`, `invited_by`, `shown_readers`.
  - `shown_readers` is the show/hide widget's selection. **Empty means "show everyone".**
  - When someone joins through an invite link, they're added to their inviter's `shown_readers`, and they start out showing themself and their inviter.
- **books**: `reader`, `title`, `author`, `author_gender`, `publisher`, `format`, `pages_total`, `pages_read`, `genre`, `tags` (list), `started_on`, `ended_on`, `status` (`reading` / `finished` / `dnf`), `rating` (half stars), `review`, `legacy_ref` (which Sheet row it was imported from).
  - A book counts for the year of its `ended_on`. DNF books keep their real end date.
- **goals**: `reader`, `year`, `target`. One per reader per year.

Who can do what:

| | Read | Create / edit | Delete |
|---|---|---|---|
| readers | everyone | group code | admin only |
| books | everyone | group code | group code |
| goals | everyone | group code | admin only |

---

## First-time setup on the VPS

This assumes a fresh start. Commands go in a terminal on your computer (`ssh`) and then on the VPS. Lines starting with `#` are comments.

### 1. Connect and check the system

```bash
ssh ubuntu@YOUR_VPS_IP          # OVH's default user is often "ubuntu" or "debian"
cat /etc/os-release             # should say Ubuntu or Debian
sudo apt update && sudo apt upgrade -y
```

### 2. Firewall

Allow SSH (so you don't lock yourself out) and web traffic, then switch it on.

```bash
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
```

### 3. Clear out the old garden setup

Caddy was installed directly on the VPS for the garden project. It holds ports 80 and 443, which the new Caddy needs.

```bash
sudo ss -tlnp | grep -E ':80 |:443 '    # shows what is using the web ports
sudo systemctl disable --now caddy      # stops the old Caddy and keeps it off after reboots
```

If the garden app itself is still running and you want to keep it, it can move behind the new shared Caddy later (one more block in `proxy/Caddyfile`).

### 4. Install Docker

Docker's official install script sets up Docker and Docker Compose.

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # lets you run docker without sudo
exit                            # log out and back in for that to apply
```

Reconnect, then check:

```bash
docker run --rm hello-world     # should print "Hello from Docker!"
```

### 5. Point the domain at the VPS

In the DNS settings of `lauramarion.eu`, add an **A record**:

| Name | Type | Value |
|---|---|---|
| `beta.dreamteam` | A | your VPS IP address |

This test address runs alongside the current GitHub Pages site. Check it has spread (can take a few minutes):

```bash
dig +short beta.dreamteam.lauramarion.eu    # should print the VPS IP
```

### 6. Get the code

```bash
sudo mkdir -p /opt/dreamteam && sudo chown $USER /opt/dreamteam
git clone https://github.com/lauramarion/dreamteam.git /opt/dreamteam
cd /opt/dreamteam
```

### 7. Start the shared proxy

```bash
docker network create web       # once only: the network Caddy and the apps share
cd /opt/dreamteam/server/proxy
docker compose up -d
```

### 8. Start Dream Team

```bash
cd /opt/dreamteam/server
cp .env.example .env
nano .env                       # set DT_GROUP_CODE, then Ctrl+O, Enter, Ctrl+X
docker compose up -d --build
docker compose ps               # "dreamteam-pb" should say "healthy" after ~30 s
```

### 9. Create your admin account

The admin account is only for you, for the admin screen. It needs an email and password, but no email is ever sent.

```bash
docker compose exec pocketbase /pb/pocketbase superuser upsert you@example.com 'a-long-password' --dir=/pb/pb_data
```

Then open **https://beta.dreamteam.lauramarion.eu/_/** and log in. You should see the `readers`, `books` and `goals` collections.

### 10. Turn on backups

In the admin screen: **Settings → Backups**.

1. Turn on **auto backups**, e.g. every night at 3:00 (`0 3 * * *`), keeping 7.
2. Strongly recommended: tick **Store backups in S3 storage** so a backup survives the VPS breaking. OVH **Object Storage** works:
   - In the OVH control panel: Public Cloud → Object Storage → create a container and an S3 user.
   - Copy the endpoint, bucket, region, access key and secret into the form, then **Test connection**.
3. Click **Initialize new backup** once to check it works.

---

## Everyday use

All from `/opt/dreamteam/server`:

| To… | Run |
|---|---|
| See if it's running | `docker compose ps` |
| See recent logs | `docker compose logs --tail=100` |
| Restart | `docker compose restart` |
| Deploy changes from GitHub | `git -C /opt/dreamteam pull && docker compose up -d --build` |
| Change the group code | edit `.env`, then `docker compose up -d` |

Schema changes (new files in `pb_migrations/`) apply by themselves when the container restarts after a deploy.

## Upgrading PocketBase

PocketBase is pre-1.0 and can change between versions, so upgrade on purpose, not automatically.

1. Read the [changelog](https://github.com/pocketbase/pocketbase/blob/master/CHANGELOG.md) from the current version up to the new one. Look for "breaking" notes about hooks (`pb_hooks/`) or migrations.
2. Take a backup (admin screen → Settings → Backups → Initialize new backup).
3. Change `PB_VERSION` in `Dockerfile`, commit, push.
4. On the VPS: `git -C /opt/dreamteam pull && docker compose up -d --build`.
5. Check the site and `docker compose logs`. If something broke, put the old `PB_VERSION` back and redeploy; restore the backup from the admin screen if data was affected.

## Troubleshooting

- **The site says it can't connect / no HTTPS:** check the DNS record points at the VPS (`dig`), then `docker compose logs` in `server/proxy`. Caddy logs certificate problems there.
- **"Code de groupe manquant ou incorrect":** the code typed on the site doesn't match `DT_GROUP_CODE` in `.env`.
- **"Le serveur n'a pas de code de groupe configuré":** `.env` is missing or `DT_GROUP_CODE` is empty. Nothing can be written until it's set.
- **Container keeps restarting:** `docker compose logs` shows the error. A typo in a hook file is the usual cause.

## Testing locally without Docker

Download the same PocketBase version from its [releases page](https://github.com/pocketbase/pocketbase/releases), then from this folder:

```bash
DT_GROUP_CODE=test ./pocketbase serve --dev --dir=./pb_data
```

The admin screen is at http://127.0.0.1:8090/_/. `--dev` prints hook errors in the terminal.
