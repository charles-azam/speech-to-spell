# Local Ministral and Voxtral (Docker)

Run the spell judge (Ministral) and speech-to-text (Voxtral) locally via vLLM instead of Mistral's cloud API. No `MISTRAL_API_KEY` needed for inference.

## Requirements

- **NVIDIA GPU**: ~24 GB VRAM for Ministral 8B, ~10–16 GB for Voxtral Mini (can run on one machine or split across GPUs).
- **Docker** with NVIDIA Container Toolkit (`nvidia-docker` or Docker with `nvidia` runtime).
- **Hugging Face token** with read access and accepted model terms for:
  - [mistralai/Ministral-8B-Instruct-2410](https://huggingface.co/mistralai/Ministral-8B-Instruct-2410)
  - [mistralai/Voxtral-Mini-3B-2507](https://huggingface.co/mistralai/Voxtral-Mini-3B-2507)

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HF_TOKEN` | Yes (for Docker) | Hugging Face token for pulling models. Used by the `ministral` and `voxtral` containers. |
| `MISTRAL_CHAT_BASE_URL` | Optional | When set, spell interpretation uses local Ministral (e.g. `http://ministral:8001/v1`). If unset, cloud Mistral is used as today. |
| `MISTRAL_AUDIO_BASE_URL` | Optional | When set, transcription uses local Voxtral (e.g. `http://voxtral:8002/v1`). If unset, cloud Voxtral or ElevenLabs is used as today. |
| `MISTRAL_API_KEY` | No (when local only) | Not needed when using only local endpoints. Kept for cloud fallback when the base URL vars are unset. |

**Backward compatibility**: If you do not set `MISTRAL_CHAT_BASE_URL` or `MISTRAL_AUDIO_BASE_URL`, the app behaves exactly as before (cloud Mistral API and existing `STT_PROVIDER` / `SPELL_PROVIDER`).

## Usage

### 1. Start the stack on the server

Set your Hugging Face token in `.env`, then start Docker:

```bash
# In .env on the server
HF_TOKEN=hf_xxxxxxxx

# From repo root on the server
docker compose -f docker-compose.yml -f docker-compose.local-models.yml up -d
```

This starts backend, nginx, ministral, and voxtral. Note the server's IP (e.g. `192.168.1.100`).

### 2. Run the frontend on your laptop

On your **local machine** (where you have Node 20+), point the frontend at the server and run the dev server:

```bash
cd frontend
npm install
VITE_API_URL=http://SERVER_IP npm run dev
```

Replace `SERVER_IP` with the server's address (e.g. `http://192.168.1.100`). Use `http://` or `https://` to match how you reach the server.

Then open **http://localhost:5173** in your browser. The game runs locally and talks to the backend on the server (API and WebSocket). Same LAN or reachable server required; backend uses `ALLOWED_ORIGINS` (default `*`) for CORS.

### 3. Optional: run only the model containers (backend on host)

   ```bash
   docker compose -f docker-compose.local-models.yml up -d ministral voxtral
   ```

   Then run the backend with:

   ```bash
   export MISTRAL_CHAT_BASE_URL=http://localhost:8001/v1
   export MISTRAL_AUDIO_BASE_URL=http://localhost:8002/v1
   uv run uvicorn speech_to_spell.main:app --reload
   ```

### Optional: serve frontend from the server

If you prefer a single URL (no dev server on the laptop), build the frontend on the server (**Node 20+** required) with `cd frontend && npm install && npm run build`. Nginx serves `frontend/dist`; open **http://SERVER_IP**.

## Troubleshooting: "Failed to fetch" / ERR_CONNECTION_TIMED_OUT

If the frontend shows **Failed to fetch** or **ERR_CONNECTION_TIMED_OUT** when creating/joining a room, the browser cannot reach the server. The backend never receives the request.

1. **Check the server IP**  
   On the server run: `hostname -I` or `ip -4 addr show`. Use the LAN IP (e.g. `192.168.x.x`). If the server is a cloud VM, use its public IP and ensure port 80 is open in the cloud firewall.

2. **Test from the laptop**  
   From your laptop run:  
   `curl -v --connect-timeout 5 http://SERVER_IP/health`  
   - If it returns `{"status":"ok"}` the server is reachable; then use that exact URL (including `http://`) as `VITE_API_URL` (no trailing slash), e.g. `VITE_API_URL=http://192.168.1.100`.  
   - If it times out or "Connection refused", the server is not reachable (wrong IP, or firewall blocking port 80).

3. **Firewall on the server**  
   Allow HTTP (port 80):  
   - **ufw**: `sudo ufw allow 80/tcp && sudo ufw status`  
   - **firewalld**: `sudo firewall-cmd --add-port=80/tcp --permanent && sudo firewall-cmd --reload`

4. **Same network**  
   Laptop and server must be on the same LAN, or the server must have a public IP with port 80 reachable from the internet (and use that IP in `VITE_API_URL`).

5. **Cloud VM (Brev, AWS, etc.)**  
   `10.0.x.x` / `172.16.x.x` are **private** IPs. Your laptop cannot reach them from the internet. You must use the instance **public IP** and open port 80 in the **cloud** firewall (Brev dashboard, AWS security group, etc.). On the server run `curl -s ifconfig.me` to see its public IP, then from the laptop try `curl -v http://PUBLIC_IP/health`. If it still fails, open TCP port 80 in the cloud provider's firewall for that instance.

6. **Brev: port-forward (recommended)**  
   From your **laptop** (with [Brev CLI](https://brev.dev/docs/reference/brev-cli) installed and logged in), forward the instance's port 80 to a local port:

   ```bash
   brev port-forward YOUR_INSTANCE_NAME --port 3000:80
   ```

   Replace `YOUR_INSTANCE_NAME` with your instance name (e.g. the one from `brev list`). This makes the server's nginx (port 80) available at **http://localhost:3000** on your laptop.

   - **Same machine:** run the frontend with `VITE_API_URL=http://localhost:3000 npm run dev` and open **http://localhost:5173**.
   - **Other devices on your network (e.g. phone):** use your laptop's IP so they can reach the tunnel. Find it with `hostname -I` or `ipconfig getifaddr en0` (Mac); e.g. `192.168.1.50`. Run the frontend with `VITE_API_URL=http://YOUR_LAPTOP_IP:3000 npm run dev`. Then on the other device open **http://YOUR_LAPTOP_IP:5173** (app) and the API/WebSocket will use `http://YOUR_LAPTOP_IP:3000`.

## Hardware notes

- **Ministral 8B**: ~24 GB GPU VRAM on a single GPU. For multi-GPU, add to the `ministral` service command: `--tensor_parallel_size 2`.
- **Voxtral Mini 3B**: ~9.5–16 GB GPU VRAM. Both containers can share one GPU if it has enough memory, or use different GPUs via `CUDA_VISIBLE_DEVICES` or separate compose profiles.

## Voxtral image

The default vLLM image does not include audio support. We use `deploy/Dockerfile.voxtral`, which extends `vllm/vllm-openai:latest` and installs `vllm[audio]` so `/v1/audio/transcriptions` is available.
