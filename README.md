# HoneyBee Enhanced

A multi-tenant honeypot orchestration platform that combines the proven honeypot-portfolio approach of HoneyBee with a durable task queue, WebSocket streaming, and a multi-org architecture. It includes real-time analytics, session replays, and a **Live Attack Map** powered by a high-performance MaxMind GeoIP database.

## 🏗️ Architecture

```text
                           +-------------+
                           |   MySQL 8   |
                           +------+------+
                                  |
                +-----------------+-----------------+
                |                                   |
        TCP :9001 (nodes)                 HTTP :5100 + WS
        +--------+--------+               +---------+----------+
        |   honeybee-core (Go)             ◀── REST + JWT      |
        |   - node TCP server              ◀── WS hub          |
        |   - HTTP REST + chi              ◀── potstore poller |
        |   - Local GeoIP DB Lookups       +--------------------+
        +-----+--+--------+----+           
              ^  |        ^    |
              |  |        |    |  TaskAssign (durable queue)
   PotEvent / |  |  ws    |    |
   SessionData|  |  push  |    v
              |  |        |  +---------+
              |  v        |  |  Node   |   honeybee-node (Go)
        +-----+----+      +--+--+------+   - dial → auth → loop
        |  Cowrie / php / | eventfwd  |   - honeypot.Manager
        |  custom pots    |  :9100    |   - cowrie .tty capture
        +-----------------+-----------+
                                              ▲
                                              | xterm.js replay
                                  +-----------+----------+
                                  |  React + Vite + TS    |
                                  |  Dashboard (Tailwind) |
                                  +----------------------+
                                              ▲
                                              |
                                  +-----------+----------+
                                  |  honeybee-cli (Go)   |
                                  +----------------------+
```

## 📦 Modules

| Path         | Purpose                                                    |
| ------------ | ---------------------------------------------------------- |
| `shared/`    | Wire protocol (`v4` envelope) + DTO models                 |
| `core/`      | Control-plane: HTTP API, WS hub, node TCP, potstore client, GeoIP logic |
| `node/`      | Per-host agent: TCP client, honeypot lifecycle, event capture |
| `cli/`       | Interactive REPL over the REST API                         |
| `dashboard/` | React/Vite SPA with xterm.js session replay and attack map |

## 🚀 Quickstart (Docker)

To spin up the entire cluster (Core API, MySQL, and Dashboard):

```bash
# Ensure GeoLite2-City.mmdb is in the project root
docker compose up -d --build
```

- **Dashboard**: `http://localhost:5173`
- **Core API**: `http://localhost:5100/api/v1/health`
- **Node TCP**: `localhost:9001`

Register a new organization from the dashboard. The first user becomes the system administrator. 
To start a node, navigate to the Nodes section, create a new node, copy the provided one-shot token, and run the agent locally or on a VPS:

```bash
HB_SERVER_ADDR=127.0.0.1:9001 HB_NODE_TOKEN=<token> \
  ./bin/honeybee-node --config node/configs/node.yaml
```

## 🌍 Testing the Live Attack Map

HoneyBee Enhanced includes a high-performance **Live Attack Map** on the dashboard. Every time a honeypot is attacked, the `core` server looks up the source IP against the loaded `GeoLite2-City.mmdb` and pushes a WebSocket payload to the dashboard to plot the attack globally in real time.

**To see it in action:**

1. **Deploy a Honeypot**: Go to your dashboard, create an organization, attach a node, and deploy a honeypot (e.g., Cowrie or a simple HTTP pot) to that node.
2. **Trigger an Attack from a Public IP**: The GeoIP database requires a public IP to map coordinates. If you attack your pot from `127.0.0.1` or a LAN IP, it will not appear on the map. Use a VPS, a VPN, or a separate external network to connect to your deployed honeypot.
3. **Watch the Map**: As soon as the connection is made (e.g., an SSH login attempt or HTTP request), a glowing dot will instantly appear on the dashboard map at the attacker's origin.

> **Note**: The core loads the `GeoLite2-City.mmdb` entirely in-memory at startup to process thousands of events per second without I/O blocking.

## 🛠️ Local Development

```bash
# 1) Build backend binaries
make core node cli

# 2) Run Core
./bin/honeybee-core --config config.example.json

# 3) Run Dashboard
cd dashboard && npm install && npm run dev
```

`vite.config.ts` proxies `/api` → `http://localhost:5100` so authentication and API routing work seamlessly in development.

## 🔐 Auth & Roles

- Uses JWT HS256 for Access (15m) and Refresh (7d) tokens. Passed via `Authorization: Bearer <jwt>`.
- Roles available: `admin` (super user), `operator` (deploy & control pots), `viewer` (read-only).

## 🛡️ Task Queue Durability

The core uses a robust queuing system for node management:
- Tasks assigned to a node start as `pending`.
- Once the node connects and the task is dispatched, it becomes `sent`.
- If the node suddenly disconnects, all `sent` tasks automatically revert to `pending`.
- Upon reconnection, `pending` tasks are efficiently flushed to the node.

## 📄 License

This combined work follows the licenses of its source projects. See upstream repositories for details.
