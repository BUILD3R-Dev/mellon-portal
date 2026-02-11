# Mellon Portal - Development Notes

## Server Access

### SSH to Mellon Franchising VM

Both steps are required. `-A` forwards the SSH agent to the bastion so the
second hop can authenticate, but the agent is empty unless `ssh-add` runs first.

```bash
# 1. Load your key into the SSH agent (once per terminal session)
ssh-add ~/.ssh/id_ed25519_old

# 2. Connect through bastion with agent forwarding + TTY
ssh -A -i ~/.ssh/id_ed25519_old root@38.32.12.11 -t "ssh build3r@192.168.1.66"
```

To run a command non-interactively (single hop):
```bash
ssh-add ~/.ssh/id_ed25519_old
ssh -A -i ~/.ssh/id_ed25519_old root@38.32.12.11 -t "ssh build3r@192.168.1.66 'sudo docker ps'"
```

### Database Access (on the VM)
```bash
# Open psql shell
sudo docker exec -it ds88g0w4s48k0888sksow4sw psql -U mellon -d mellon_portal

# Run a quick SQL statement
sudo docker exec ds88g0w4s48k0888sksow4sw \
  psql -U mellon -d mellon_portal \
  -c "SELECT * FROM users LIMIT 5;"

# Run a migration file
sudo docker cp my_migration.sql ds88g0w4s48k0888sksow4sw:/tmp/migration.sql
sudo docker exec ds88g0w4s48k0888sksow4sw \
  psql -U mellon -d mellon_portal -f /tmp/migration.sql
```

### Database Details
- PostgreSQL 17
- User: mellon
- Database: mellon_portal
- Port: 5432
- Docker container ID: ds88g0w4s48k0888sksow4sw

### App
- Port: 4321
- Public URL: https://portal.mellonfranchising.com
- Deployed via Coolify, auto-deploys on push to main
