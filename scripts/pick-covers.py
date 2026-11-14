#!/usr/bin/env python3
"""本地 Web 选封面：解析图址 → 浏览器加载预览 → 勾选后统一落盘并切 local。

用法:
  python3 scripts/pick-covers.py

- /api/resolve 只解析出最终图片 URL（跟 302 / 读 JSON），很快
- 浏览器并发加载这些直链预览（快，且可勾选）
- /api/save 接收选中的 dataUrl 或 url，写 public/img/cover 并改 site.yaml
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import random
import re
import threading
import urllib.error
import urllib.request
import webbrowser
from concurrent.futures import ThreadPoolExecutor, as_completed
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote_to_bytes, urlparse

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
COVER_DIR = ROOT / "public" / "img" / "cover"
SITE_YAML = ROOT / "config" / "site.yaml"
IMG_DIR = ROOT / "public" / "img"
HERO_WIDTHS = (800, 1200, 1600, 1920)
HERO_FALLBACK_URL = "/img/site_header_1920.webp"
WEBP_QUALITY = 82
RESOLVE_TIMEOUT = 8
USER_AGENT = "Mozilla/5.0 (compatible; code-guide-pick-covers/2.1)"

# 实测可用图源；json 读字段拿直链，redirect 跟随 302 拿最终地址
PROVIDERS = [
    {
        "id": "xxapi_json",
        "name": "小小API·JSON",
        "kind": "json",
        "url": "https://v2.xxapi.cn/api/randomAcgPic?type=pc&return=json",
        "pick": ["data", "url", "imgurl", "image"],
    },
    {
        "id": "yppp_json",
        "name": "夜轻·JSON",
        "kind": "json",
        "url": "https://api.yppp.net/pc?return=json",
        "pick": ["acgurl", "url", "imgurl", "img", "data"],
    },
    {
        "id": "loliapi_json",
        "name": "LoliApi·JSON",
        "kind": "json",
        "url": "https://www.loliapi.com/acg/pc/?type=json",
        "pick": ["url", "imgurl"],
    },
    {
        "id": "kanzaki_json",
        "name": "神崎·JSON",
        "kind": "json",
        "url": "https://api.kanzaki.moe/acgnAPI.php?return=json",
        "pick": ["acgnAPI", "url"],
    },
    {"id": "xxapi", "name": "小小API", "kind": "redirect", "url": "https://v2.xxapi.cn/api/randomAcgPic?type=pc&return=302"},
    {"id": "zichen", "name": "梓晨ACG", "kind": "redirect", "url": "https://app.zichen.zone/api/acg/api.php"},
    {
        "id": "uapis_acg",
        "name": "Uapis ACG·PC",
        "kind": "redirect",
        "url": "https://uapis.cn/api/v1/random/image?category=acg&type=pc",
    },
    {
        "id": "uapis_anime",
        "name": "Uapis Anime",
        "kind": "redirect",
        "url": "https://uapis.cn/api/v1/random/image?category=anime",
    },
    {"id": "yppp", "name": "夜轻·横图", "kind": "redirect", "url": "https://api.yppp.net/pc"},
    {"id": "zhuqiy", "name": "Zhuqiy PC", "kind": "redirect", "url": "https://rimg.zhuqiy.top/api/random?type=pc"},
]

PROVIDER_BY_ID = {p["id"]: p for p in PROVIDERS}

PAGE_HTML = r"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>挑选封面 → 本地化</title>
  <style>
    :root {
      --bg: #0f1419; --panel: #1a222c; --border: #2c3848;
      --text: #e7eef7; --muted: #8b9bb0; --accent: #3b82f6;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; font: 14px/1.5 system-ui, sans-serif; color: var(--text);
      background: radial-gradient(1200px 600px at 10% -10%, #1b2a40, transparent), var(--bg);
      min-height: 100vh;
    }
    header {
      position: sticky; top: 0; z-index: 10;
      display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
      padding: 12px 16px; border-bottom: 1px solid var(--border);
      background: color-mix(in srgb, var(--panel) 92%, transparent);
      backdrop-filter: blur(8px);
    }
    h1 { font-size: 16px; margin: 0 8px 0 0; }
    label { color: var(--muted); display: inline-flex; gap: 6px; align-items: center; }
    select, input[type=number], button {
      font: inherit; color: var(--text); background: var(--bg);
      border: 1px solid var(--border); border-radius: 8px; padding: 7px 10px;
    }
    button { cursor: pointer; }
    button.primary { background: var(--accent); border-color: transparent; font-weight: 600; }
    button:disabled { opacity: .5; cursor: not-allowed; }
    #status { color: var(--muted); margin-left: auto; }
    main { padding: 16px; }
    .grid {
      display: grid; gap: 14px;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    }
    .card {
      background: var(--panel); border: 2px solid var(--border); border-radius: 12px;
      overflow: hidden; cursor: pointer; transition: border-color .15s, transform .15s;
    }
    .card:hover { transform: translateY(-1px); }
    .card.selected { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
    .card img { display: block; width: 100%; height: 150px; object-fit: cover; background: #111; }
    .card .meta {
      display: flex; justify-content: space-between; gap: 8px;
      padding: 8px 10px; color: var(--muted); font-size: 12px;
    }
    .badge {
      display: none; width: 22px; height: 22px; border-radius: 999px;
      align-items: center; justify-content: center; background: var(--accent); color: #fff;
    }
    .card.selected .badge { display: inline-flex; }
    .empty { color: var(--muted); padding: 48px 8px; text-align: center; }
    footer {
      position: sticky; bottom: 0; display: flex; gap: 12px; align-items: center; justify-content: flex-end;
      padding: 12px 16px; border-top: 1px solid var(--border);
      background: color-mix(in srgb, var(--panel) 94%, transparent);
      backdrop-filter: blur(8px);
    }
  </style>
</head>
<body>
  <header>
    <h1>挑选封面</h1>
    <label>图源
      <select id="provider"></select>
    </label>
    <label>每次
      <input id="batch" type="number" min="4" max="32" value="12" />
    </label>
    <label title="写入 site_header_800/1200/1600/1920.webp">
      <input id="replaceHero" type="checkbox" checked /> 替换头图（多尺寸）
    </label>
    <button id="fetchBtn" class="primary" type="button">再拉一批</button>
    <button id="clearBtn" type="button">清空候选</button>
    <span id="status">失败会自动换源重试；只展示成功的图</span>
  </header>
  <main>
    <div id="grid" class="grid"><div class="empty">还没有候选图</div></div>
  </main>
  <footer>
    <span id="count">已选 0</span>
    <button id="saveBtn" class="primary" type="button" disabled>保存到本地并切换</button>
  </footer>
  <script>
    const PROVIDERS = __PROVIDERS_JSON__;
    const state = { items: [], busy: false, seq: 0 };

    const el = (id) => document.getElementById(id);
    const grid = el('grid');
    const status = el('status');
    const count = el('count');
    const fetchBtn = el('fetchBtn');
    const clearBtn = el('clearBtn');
    const saveBtn = el('saveBtn');
    const providerSel = el('provider');

    providerSel.innerHTML =
      '<option value="all">全部轮询</option>' +
      PROVIDERS.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');

    function setBusy(busy) {
      state.busy = busy;
      fetchBtn.disabled = busy;
      clearBtn.disabled = busy;
      refreshMeta();
    }

    function refreshMeta() {
      const n = state.items.filter((x) => x.selected).length;
      count.textContent = `已选 ${n} / 可保存 ${state.items.length}`;
      saveBtn.disabled = state.busy || n === 0;
    }

    function render() {
      grid.innerHTML = '';
      if (!state.items.length) {
        grid.innerHTML = '<div class="empty">还没有候选图</div>';
        refreshMeta();
        return;
      }
      for (const item of state.items) {
        const card = document.createElement('article');
        card.className = 'card' + (item.selected ? ' selected' : '');
        card.innerHTML = `
          <img alt="" decoding="async" referrerpolicy="no-referrer" src="${item.previewUrl}" />
          <div class="meta"><span>${item.source}</span><span class="badge">✓</span></div>`;
        card.addEventListener('click', () => {
          item.selected = !item.selected;
          card.classList.toggle('selected', item.selected);
          refreshMeta();
        });
        grid.appendChild(card);
      }
      refreshMeta();
    }

    function bust(url) {
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}_t=${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    function blobToDataUrl(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('read failed'));
        reader.readAsDataURL(blob);
      });
    }

    function loadImage(url) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.decoding = 'async';
        img.referrerPolicy = 'no-referrer';
        const timer = setTimeout(() => reject(new Error('image timeout')), 10000);
        img.onload = () => { clearTimeout(timer); resolve(img); };
        img.onerror = () => { clearTimeout(timer); reject(new Error('image load failed')); };
        img.src = bust(url);
      });
    }

    async function captureFromUrl(url) {
      const img = await loadImage(url);
      // remoteUrl 始终保留：dataUrl 无效时可回退下载
      const remoteUrl = url;

      try {
        const res = await fetch(bust(url), { mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' });
        if (res.ok) {
          const blob = await res.blob();
          const type = (blob.type || '').toLowerCase();
          if (blob.size > 0 && (type.startsWith('image/') || type === '' || type === 'application/octet-stream')) {
            const dataUrl = await blobToDataUrl(blob);
            if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
              return { previewUrl: URL.createObjectURL(blob), dataUrl, remoteUrl };
            }
          }
        }
      } catch (_) {}

      return { previewUrl: img.src, dataUrl: null, remoteUrl };
    }

    async function resolveProvider(provider) {
      const res = await fetch(`/api/resolve?id=${encodeURIComponent(provider.id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'resolve failed');
      return data;
    }

    function pickProviders() {
      const id = providerSel.value;
      if (id === 'all') return [...PROVIDERS];
      return PROVIDERS.filter((p) => p.id === id);
    }

    /** 失败自动换源重试，成功才入列表 */
    async function loadOneSlot(providers, slotIndex) {
      const maxTry = Math.max(4, providers.length);
      let lastErr = null;
      for (let attempt = 0; attempt < maxTry; attempt++) {
        const provider = providers[(slotIndex + attempt) % providers.length];
        try {
          const resolved = await resolveProvider(provider);
          const captured = await captureFromUrl(resolved.url);
          state.items.push({
            id: `local-${++state.seq}`,
            source: resolved.name || provider.name,
            selected: false,
            previewUrl: captured.previewUrl,
            dataUrl: captured.dataUrl,
            remoteUrl: captured.remoteUrl,
          });
          render();
          return true;
        } catch (err) {
          lastErr = err;
        }
      }
      console.warn('slot failed', lastErr);
      return false;
    }

    async function fetchBatch() {
      if (state.busy) return;
      setBusy(true);
      const batch = Number(el('batch').value) || 12;
      const providers = pickProviders();
      let ok = 0;
      let done = 0;
      status.textContent = `拉取中 0/${batch}…`;

      const jobs = Array.from({ length: batch }, (_, i) =>
        loadOneSlot(providers, i).then((success) => {
          done += 1;
          if (success) ok += 1;
          status.textContent = `拉取中 ${done}/${batch}（成功 ${ok}）…`;
        }),
      );
      await Promise.allSettled(jobs);
      status.textContent = `本轮成功 ${ok}/${batch}（可继续再拉）`;
      setBusy(false);
    }

    async function saveSelected() {
      const selected = state.items.filter((x) => x.selected);
      if (!selected.length) return;
      const heroNote = el('replaceHero').checked
        ? '\n并用第一张勾选图生成 site_header_800/1200/1600/1920.webp。'
        : '';
      if (!confirm(`将保存 ${selected.length} 张到 public/img/cover，并把 covers 切到 local。${heroNote}\n继续？`)) return;

      setBusy(true);
      status.textContent = '正在保存…';
      try {
        const res = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: selected.map((x) => ({
              dataUrl: x.dataUrl || undefined,
              url: x.remoteUrl || undefined,
            })),
            replaceHero: el('replaceHero').checked,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || res.statusText);
        status.textContent = `已保存 ${data.count} 张，covers → local`;
        alert('完成。建议执行：pnpm koharu generate lqips，然后重启 dev / rebuild。');
      } catch (err) {
        status.textContent = String(err.message || err);
        alert('保存失败：' + (err.message || err));
      } finally {
        setBusy(false);
        refreshMeta();
      }
    }

    fetchBtn.addEventListener('click', fetchBatch);
    clearBtn.addEventListener('click', () => {
      for (const item of state.items) {
        if (item.previewUrl && item.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl);
      }
      state.items = [];
      status.textContent = '已清空候选';
      render();
    });
    saveBtn.addEventListener('click', saveSelected);
    render();
  </script>
</body>
</html>
"""


def http_get(url: str, timeout: float = RESOLVE_TIMEOUT) -> tuple[bytes, str, str]:
    """GET 并返回 (body, final_url, content_type)。"""
    sep = "&" if "?" in url else "?"
    request_url = f"{url}{sep}_t={random.randint(1, 10**9)}"
    req = urllib.request.Request(
        request_url,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json,image/*,*/*;q=0.8"},
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read(), resp.geturl(), (resp.headers.get("Content-Type") or "").lower()


def pick_json_url(data: object, keys: list[str]) -> str | None:
    if not isinstance(data, dict):
        return None
    for key in keys:
        value = data.get(key)
        if isinstance(value, str) and value.startswith(("http://", "https://")):
            return value
        if isinstance(value, dict):
            nested = pick_json_url(value, ["url", "imgurl", "acgurl", "image", "src", "data"])
            if nested:
                return nested
    return None


def normalize_image_url(url: str) -> str:
    url = url.strip()
    if url.startswith("http://"):
        url = "https://" + url[len("http://") :]
    return url


def resolve_provider(provider: dict) -> str:
    """解析出可直接加载的最终图片 URL。"""
    # 1. JSON：读字段
    if provider["kind"] == "json":
        body, _, content_type = http_get(provider["url"])
        if "json" not in content_type and not body.lstrip().startswith((b"{", b"[")):
            raise ValueError(f"{provider['id']}: not json ({content_type})")
        data = json.loads(body.decode("utf-8", errors="replace"))
        image_url = pick_json_url(data, list(provider.get("pick") or ["url"]))
        if not image_url:
            raise ValueError(f"{provider['id']}: json missing url keys={provider.get('pick')}")
        return normalize_image_url(image_url)

    # 2. redirect / 直出图：跟随跳转，拿最终地址（只读少量字节确认是图）
    body, final_url, content_type = http_get(provider["url"])
    if "json" in content_type:
        data = json.loads(body.decode("utf-8", errors="replace"))
        image_url = pick_json_url(data, ["acgurl", "acgnAPI", "data", "url", "imgurl", "image"])
        if image_url:
            return normalize_image_url(image_url)
    if not body:
        raise ValueError(f"{provider['id']}: empty body")
    if body.lstrip()[:9].lower().startswith(b"<!doctype") or body.lstrip()[:6].lower().startswith(b"<html"):
        raise ValueError(f"{provider['id']}: got html instead of image")
    return normalize_image_url(final_url)


def save_webp(img: Image.Image, path: Path, *, max_width: int | None = 1920) -> None:
    out = img
    if max_width and out.width > max_width:
        ratio = max_width / out.width
        out = out.resize((max_width, max(1, int(out.height * ratio))), Image.Resampling.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    out.save(path, format="WEBP", quality=WEBP_QUALITY, method=6)


def save_hero_set(img: Image.Image) -> None:
    master = img
    max_w = max(HERO_WIDTHS)
    if master.width > max_w:
        ratio = max_w / master.width
        master = master.resize((max_w, max(1, int(master.height * ratio))), Image.Resampling.LANCZOS)
    for width in HERO_WIDTHS:
        path = IMG_DIR / f"site_header_{width}.webp"
        if master.width <= width:
            save_webp(master, path, max_width=None)
        else:
            ratio = width / master.width
            sized = master.resize((width, max(1, int(master.height * ratio))), Image.Resampling.LANCZOS)
            save_webp(sized, path, max_width=None)


def patch_site_yaml_to_local(cover_paths: list[str], hero_path: str) -> None:
    text = SITE_YAML.read_text(encoding="utf-8")
    list_yaml = "\n".join(f"      - {p}" for p in cover_paths)
    new_block = f"""covers:
  hero:
    mode: local
    sessionSticky: true
    fallback: {hero_path}
  post:
    mode: local
    sessionSticky: true
    fallbackList:
{list_yaml}
"""
    pattern = re.compile(
        r"^covers:\n(?:.*\n)*?(?=(?:^# =+\n|^[a-zA-Z].*:))",
        re.MULTILINE,
    )
    if not pattern.search(text):
        raise RuntimeError("config/site.yaml 中未找到 covers: 段")
    SITE_YAML.write_text(pattern.sub(new_block + "\n", text, count=1), encoding="utf-8")


def decode_data_url(data_url: str) -> Image.Image:
    """解析 data URL；兼容 data:image/* 与缺省 MIME 的 base64。"""
    if not isinstance(data_url, str) or not data_url.startswith("data:"):
        raise ValueError("invalid data url")
    header, _, payload = data_url.partition(",")
    if not payload:
        raise ValueError("empty data url payload")
    # 1. 只要是 base64（或未标明时按 base64 试）
    if ";base64" in header or "base64" in header.lower():
        raw = base64.b64decode(payload, validate=False)
    else:
        raw = unquote_to_bytes(payload)
    img = Image.open(io.BytesIO(raw))
    img.load()
    return img.convert("RGB")


def fetch_remote_image(url: str) -> Image.Image:
    if not isinstance(url, str) or not url.startswith(("http://", "https://")):
        raise ValueError(f"invalid image url: {url!r}")
    body, _, _ = http_get(url, timeout=15)
    img = Image.open(io.BytesIO(body))
    img.load()
    return img.convert("RGB")


def materialize_image(item: dict) -> Image.Image:
    """优先 dataUrl，失败或不合法则回退 url 下载。"""
    if not isinstance(item, dict):
        raise ValueError("each image must be an object")
    data_url = item.get("dataUrl")
    url = item.get("url")
    errors: list[str] = []

    # 1. 尝试前端提交的 dataUrl
    if isinstance(data_url, str) and data_url.startswith("data:"):
        try:
            return decode_data_url(data_url)
        except Exception as exc:
            errors.append(f"dataUrl: {exc}")

    # 2. 回退到最终图址
    if isinstance(url, str) and url.startswith(("http://", "https://")):
        try:
            return fetch_remote_image(url)
        except Exception as exc:
            errors.append(f"url: {exc}")

    raise ValueError("; ".join(errors) if errors else "image needs dataUrl or url")


def render_page() -> bytes:
    html = PAGE_HTML.replace("__PROVIDERS_JSON__", json.dumps(PROVIDERS, ensure_ascii=False))
    return html.encode("utf-8")


class Handler(BaseHTTPRequestHandler):
    server_version = "PickCovers/2.1"

    def log_message(self, fmt: str, *args) -> None:
        print(f"[pick-covers] {self.address_string()} - {fmt % args}")

    def _send(self, code: int, body: bytes, content_type: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, code: int, payload: dict) -> None:
        self._send(code, json.dumps(payload, ensure_ascii=False).encode("utf-8"), "application/json; charset=utf-8")

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path in ("/", "/index.html"):
            self._send(200, render_page(), "text/html; charset=utf-8")
            return
        if parsed.path == "/api/resolve":
            self._handle_resolve(parse_qs(parsed.query))
            return
        self._json(404, {"error": "not found"})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path != "/api/save":
            self._json(404, {"error": "not found"})
            return
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            self._json(400, {"error": "invalid json"})
            return
        self._handle_save(payload)

    def _handle_resolve(self, query: dict[str, list[str]]) -> None:
        provider_id = (query.get("id") or [""])[0]
        provider = PROVIDER_BY_ID.get(provider_id)
        if not provider:
            self._json(400, {"error": f"unknown provider: {provider_id}"})
            return
        try:
            url = resolve_provider(provider)
        except Exception as exc:
            self._json(502, {"error": str(exc)})
            return
        self._json(200, {"id": provider["id"], "name": provider["name"], "url": url})

    def _handle_save(self, payload: dict) -> None:
        images = payload.get("images")
        if not isinstance(images, list) or not images:
            self._json(400, {"error": "images must be a non-empty list"})
            return
        replace_hero = bool(payload.get("replaceHero", True))
        try:
            decoded: list[Image.Image | None] = [None] * len(images)
            with ThreadPoolExecutor(max_workers=min(8, len(images))) as pool:
                futures = {pool.submit(materialize_image, item): idx for idx, item in enumerate(images)}
                for fut in as_completed(futures):
                    decoded[futures[fut]] = fut.result()
            ready = [img for img in decoded if img is not None]
            if len(ready) != len(images):
                raise RuntimeError("failed to materialize some images")

            COVER_DIR.mkdir(parents=True, exist_ok=True)
            for old in COVER_DIR.glob("*.webp"):
                old.unlink()
            cover_urls: list[str] = []
            for i, img in enumerate(ready, start=1):
                save_webp(img, COVER_DIR / f"{i}.webp")
                cover_urls.append(f"/img/cover/{i}.webp")

            hero_url = cover_urls[0]
            if replace_hero:
                save_hero_set(ready[0])
                hero_url = HERO_FALLBACK_URL
            patch_site_yaml_to_local(cover_urls, hero_url)
        except Exception as exc:
            self._json(500, {"error": str(exc)})
            return
        self._json(200, {"ok": True, "count": len(ready), "covers": cover_urls, "hero": hero_url})


def bind_server(host: str, port: int) -> tuple[ThreadingHTTPServer, int]:
    ThreadingHTTPServer.allow_reuse_address = True
    last_error: OSError | None = None
    for candidate in range(port, port + 20):
        try:
            return ThreadingHTTPServer((host, candidate), Handler), candidate
        except OSError as exc:
            last_error = exc
    raise OSError(f"无法绑定 {host}:{port}–{port + 19}: {last_error}") from last_error


def main() -> None:
    parser = argparse.ArgumentParser(description="Web UI：挑选封面并本地化")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--no-open", action="store_true")
    args = parser.parse_args()

    server, port = bind_server(args.host, args.port)
    url = f"http://{args.host}:{port}/"
    if port != args.port:
        print(f"端口 {args.port} 已被占用，改用 {port}")
    print(f"选封面页面: {url}")
    print("保存后建议: pnpm koharu generate lqips && 重启 pnpm dev")
    if not args.no_open:
        threading.Timer(0.4, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n已退出")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
