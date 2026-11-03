#!/usr/bin/env python3
"""SIMPENAN — Sistem Peminjaman Ruangan IDB Bali.

Dependency-free web app: Python standard library + SQLite.
Run:  python3 app/server.py
"""

import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import sqlite3
import sys
import time
import urllib.parse
import uuid
from datetime import datetime, timedelta, timezone
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

BASE = Path(__file__).resolve().parent
STATIC = BASE / "static"
DATA = BASE / "data"
UPLOAD_DIR = BASE / "uploads"
DB_PATH = DATA / "simpenan.db"

sys.path.insert(0, str(BASE))
from pdfgen import build_confirmation_pdf, build_proposal_pdf, today_label  # noqa: E402

HOST = os.environ.get("SIMPENAN_HOST", "127.0.0.1")
PORT = int(os.environ.get("SIMPENAN_PORT", "8000"))
SEED_DEMO = os.environ.get("SIMPENAN_SEED_DEMO", "0") == "1"

WITA = timezone(timedelta(hours=8))
DAY_START = 8 * 60
DAY_END = 18 * 60
MAX_UPLOAD = 5 * 1024 * 1024
SESSION_DAYS = 30

DAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli",
               "Agustus", "September", "Oktober", "November", "Desember"]
CATEGORY_LABEL = {"terbuka": "Ruang Terbuka", "kelas": "Ruang Kelas", "fasilitas": "Ruang Diskusi", "perpustakaan": "Perpustakaan"}
CATEGORY_DAYS = {"terbuka": [0, 1, 2, 3, 4, 5], "kelas": [5], "fasilitas": [0, 1, 2, 3, 4], "perpustakaan": [0, 1, 2, 3, 4]}
CATEGORY_DAYS_LABEL = {"terbuka": "Senin–Sabtu", "kelas": "Sabtu", "fasilitas": "Senin–Jumat", "perpustakaan": "Senin–Jumat"}

ROOM_ART = {
    "terbuka": "/static/assets/rooms/generic-terbuka.svg",
    "kelas": "/static/assets/rooms/generic-kelas.svg",
}


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

def connect():
    conn = sqlite3.connect(str(DB_PATH), timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def hash_code(code, salt):
    return hashlib.pbkdf2_hmac("sha256", code.encode("utf-8"), bytes.fromhex(salt), 120_000).hex()


def make_salt():
    return secrets.token_hex(16)


def init_db():
    DATA.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    conn = connect()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            short_name TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('org', 'baa')),
            accent TEXT NOT NULL DEFAULT '#1C6B7A',
            salt TEXT NOT NULL,
            code_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL CHECK (category IN ('terbuka', 'kelas', 'fasilitas', 'perpustakaan')),
            capacity INTEGER NOT NULL,
            location TEXT NOT NULL DEFAULT '',
            description TEXT NOT NULL DEFAULT '',
            facilities TEXT NOT NULL DEFAULT '',
            image TEXT NOT NULL,
            active INTEGER NOT NULL DEFAULT 1,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE,
            account_id INTEGER NOT NULL REFERENCES accounts(id),
            room_id INTEGER NOT NULL REFERENCES rooms(id),
            date TEXT NOT NULL,
            start_time TEXT NOT NULL,
            duration INTEGER NOT NULL,
            participants INTEGER NOT NULL,
            purpose TEXT NOT NULL,
            contact_name TEXT NOT NULL,
            contact_nim TEXT NOT NULL,
            contact_wa TEXT NOT NULL,
            attachment_name TEXT,
            attachment_path TEXT,
            status TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
            rejection_reason TEXT,
            created_at TEXT NOT NULL,
            decided_at TEXT
        );

        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
            created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_bookings_room_date ON bookings(room_id, date);
        CREATE INDEX IF NOT EXISTS idx_bookings_account ON bookings(account_id);
        """
    )
    conn.commit()
    migrate_room_categories(conn)
    seed_accounts(conn)
    seed_rooms(conn)
    ensure_new_rooms(conn)
    if SEED_DEMO:
        seed_demo_bookings(conn)
    conn.close()


def migrate_room_categories(conn):
    row = conn.execute("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'rooms'").fetchone()
    if not row or "fasilitas" in (row["sql"] or ""):
        return
    conn.commit()
    conn.execute("PRAGMA foreign_keys = OFF")
    try:
        conn.executescript(
            """
            BEGIN;
            CREATE TABLE rooms_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL CHECK (category IN ('terbuka', 'kelas', 'fasilitas', 'perpustakaan')),
                capacity INTEGER NOT NULL,
                location TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                facilities TEXT NOT NULL DEFAULT '',
                image TEXT NOT NULL,
                active INTEGER NOT NULL DEFAULT 1,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );
            INSERT INTO rooms_new (id, name, category, capacity, location, description, facilities, image, active, sort_order, created_at)
                SELECT id, name, category, capacity, location, description, facilities, image, active, sort_order, created_at FROM rooms;
            DROP TABLE rooms;
            ALTER TABLE rooms_new RENAME TO rooms;
            COMMIT;
            """
        )
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.execute("PRAGMA foreign_keys = ON")
    broken = conn.execute("PRAGMA foreign_key_check").fetchall()
    if broken:
        raise RuntimeError("Migrasi kategori ruangan gagal: integritas data tidak valid.")


def ensure_new_rooms(conn):
    rooms = [
        ("Lab PC 1C", "kelas", 30, "Gedung C · Ruang 1C", "Laboratorium komputer dengan 30 unit PC untuk kelas praktik, pelatihan perangkat lunak, dan kegiatan akademik.",
         "30 PC, Proyektor, AC, Meja praktik, Colokan listrik", "/static/assets/rooms/photos/lab-pc-1c.jpg", 8),
        ("Perpustakaan", "fasilitas", 6, "Gedung A · Area Perpustakaan", "Ruang baca dengan koleksi buku, meja diskusi, dan suasana tenang untuk kegiatan belajar serta diskusi kelompok kecil.",
         "Koleksi buku, Meja baca, AC, Pencahayaan, Colokan listrik", "/static/assets/rooms/photos/perpustakaan.jpg", 9),
        ("Ruang INBIS", "fasilitas", 8, "Inkubator Bisnis · IDB Bali", "Ruang diskusi Inkubator Bisnis dengan layar presentasi dan meja kolaborasi untuk kegiatan mentoring, rapat, serta diskusi kelompok kecil.",
         "Layar presentasi, Meja diskusi, AC, Colokan listrik, Papan tulis", "/static/assets/rooms/photos/ruang-inbis.jpg", 10),
    ]
    conn.execute("UPDATE rooms SET category = 'fasilitas' WHERE category = 'perpustakaan'")
    now = now_iso()
    for room in rooms:
        if conn.execute("SELECT 1 FROM rooms WHERE name = ?", (room[0],)).fetchone():
            continue
        conn.execute(
            "INSERT INTO rooms (name, category, capacity, location, description, facilities, image, sort_order, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            room + (now,),
        )
    conn.commit()


def seed_accounts(conn):
    if conn.execute("SELECT COUNT(*) FROM accounts").fetchone()[0]:
        return
    accounts = [
        ("HMJ Bisnis Digital", "HMJ Bisnis Digital", "org", "#1C6B7A", "1234"),
        ("UKM Thunder", "UKM Thunder", "org", "#D97B29", "4321"),
        ("BAA IDB Bali", "BAA IDB Bali", "baa", "#101F24", "0000"),
    ]
    now = now_iso()
    for name, short, role, accent, code in accounts:
        salt = make_salt()
        conn.execute(
            "INSERT INTO accounts (name, short_name, role, accent, salt, code_hash, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?)",
            (name, short, role, accent, salt, hash_code(code, salt), now),
        )
    conn.commit()


def seed_rooms(conn):
    if conn.execute("SELECT COUNT(*) FROM rooms").fetchone()[0]:
        return
    rooms = [
        ("Aula", "terbuka", 100, "Gedung A · Lantai 1", "Aula utama kampus dengan panggung, tata suara, dan proyektor untuk kegiatan berskala besar.",
         "Panggung, Sound system, Proyektor, AC, Kursi lipat", "/static/assets/rooms/photos/aula.jpg", 1),
        ("Ruangan Serbaguna", "terbuka", 50, "Gedung Serbaguna", "Ruang fleksibel dengan tata letak modular untuk kegiatan workshop, rapat, dan kegiatan organisasi.",
         "Meja modular, Proyektor, Whiteboard, AC, Colokan listrik", "/static/assets/rooms/photos/serbaguna.jpg", 2),
        ("Halaman Padmasana", "terbuka", 20, "Area Padmasana · Luar Ruang", "Area terbuka di lingkungan kampus untuk kegiatan spiritual, pertemuan, dan kegiatan komunitas.",
         "Area luar ruang, Kursi, Tenda opsional, Penerangan", "/static/assets/rooms/photos/padmasana.jpg", 3),
        ("Lab iMac", "kelas", 30, "Gedung C · Lantai 3", "Laboratorium komputer dengan 30 unit iMac untuk kelas desain digital, penyuntingan, dan produksi kreatif.",
         "30 iMac, Proyektor, AC, Sound system, Colokan listrik", "/static/assets/rooms/photos/lab-imac.jpg", 4),
        ("Studio 3", "kelas", 30, "Gedung C · Lantai 2", "Studio kreatif dengan backdrop dan pencahayaan untuk kelas fotografi serta produksi visual.",
         "Backdrop, Lighting kit, Kamera, Sofa, AC", "/static/assets/rooms/photos/studio-3.jpg", 5),
        ("Lab Fashion", "kelas", 30, "Gedung D · Lantai 1", "Laboratorium tata busana dengan meja kerja, mesin jahit, dan manekin untuk kelas praktik desain fashion.",
         "Mesin jahit, Manekin, Meja potong, Papan setrika, AC", "/static/assets/rooms/photos/lab-fashion.jpg", 6),
        ("Lecture 2D", "kelas", 30, "Gedung A · Lantai 2", "Ruang kuliah dengan papan tulis, proyektor, dan tata duduk untuk kelas teori maupun presentasi.",
         "Whiteboard, Proyektor, AC, Meja kuliah, Sound system", "/static/assets/rooms/photos/lecture-2d.jpg", 7),
        ("Lab PC 1C", "kelas", 30, "Gedung C · Ruang 1C", "Laboratorium komputer dengan 30 unit PC untuk kelas praktik, pelatihan perangkat lunak, dan kegiatan akademik.",
         "30 PC, Proyektor, AC, Meja praktik, Colokan listrik", "/static/assets/rooms/photos/lab-pc-1c.jpg", 8),
        ("Perpustakaan", "fasilitas", 6, "Gedung A · Area Perpustakaan", "Ruang baca dengan koleksi buku, meja diskusi, dan suasana tenang untuk kegiatan belajar serta diskusi kelompok kecil.",
         "Koleksi buku, Meja baca, AC, Pencahayaan, Colokan listrik", "/static/assets/rooms/photos/perpustakaan.jpg", 9),
        ("Ruang INBIS", "fasilitas", 8, "Inkubator Bisnis · IDB Bali", "Ruang diskusi Inkubator Bisnis dengan layar presentasi dan meja kolaborasi untuk kegiatan mentoring, rapat, serta diskusi kelompok kecil.",
         "Layar presentasi, Meja diskusi, AC, Colokan listrik, Papan tulis", "/static/assets/rooms/photos/ruang-inbis.jpg", 10),
    ]
    conn.execute("UPDATE rooms SET category = 'fasilitas' WHERE category = 'perpustakaan'")
    now = now_iso()
    for room in rooms:
        conn.execute(
            "INSERT INTO rooms (name, category, capacity, location, description, facilities, image, sort_order, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            room + (now,),
        )
    conn.commit()


def insert_booking(conn, *, account_id, room_id, date, start_time, duration, participants,
                   purpose, contact_name, contact_nim, contact_wa, attachment_name=None,
                   attachment_path=None, status="pending", rejection_reason=None, created_at=None,
                   decided_at=None):
    created = created_at or now_iso()
    cur = conn.execute(
        """INSERT INTO bookings
        (code, account_id, room_id, date, start_time, duration, participants, purpose,
         contact_name, contact_nim, contact_wa, attachment_name, attachment_path,
         status, rejection_reason, created_at, decided_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        ("PENDING", account_id, room_id, date, start_time, duration, participants, purpose,
         contact_name, contact_nim, contact_wa, attachment_name, attachment_path,
         status, rejection_reason, created, decided_at),
    )
    booking_id = cur.lastrowid
    code = "SPN-%d-%04d" % (int(date[:4]) if date else local_now().year, booking_id)
    conn.execute("UPDATE bookings SET code = ? WHERE id = ?", (code, booking_id))
    conn.commit()
    return booking_id


def seed_demo_bookings(conn):
    if conn.execute("SELECT COUNT(*) FROM bookings").fetchone()[0]:
        return
    orgs = {r["short_name"]: r["id"] for r in conn.execute("SELECT id, short_name FROM accounts")}
    rooms = {r["name"]: r["id"] for r in conn.execute("SELECT id, name FROM rooms")}
    if "HMJ Bisnis Digital" not in orgs or "Aula" not in rooms:
        return

    today = local_now().date()
    saturday = today + timedelta(days=(5 - today.weekday()) % 7 or 7)
    tomorrow = today + timedelta(days=1)
    if tomorrow.weekday() == 6:
        tomorrow += timedelta(days=1)
    monday = today + timedelta(days=(7 - today.weekday()) % 7 or 7)

    demo = [
        dict(account_id=orgs["HMJ Bisnis Digital"], room_id=rooms["Aula"], date=saturday.isoformat(),
             start_time="10:00", duration=120, participants=80,
             purpose="Seminar Nasional Bisnis Digital 2026: Membangun Ekosistem Kreatif Bali",
             contact_name="Ni Made Ayu Lestari", contact_nim="2023010234", contact_wa="081234567890",
             status="pending", created_at=(today - timedelta(days=1)).isoformat() + "T10:24:00+08:00"),
        dict(account_id=orgs.get("UKM Thunder", orgs["HMJ Bisnis Digital"]), room_id=rooms["Ruangan Serbaguna"],
             date=tomorrow.isoformat(), start_time="13:00", duration=180, participants=40,
             purpose="Rapat koordinasi kepengurusan dan persiapan konser tahunan Thunder Fest",
             contact_name="I Gusti Ngurah Bagus", contact_nim="2022020188", contact_wa="081987654321",
             status="approved", created_at=(today - timedelta(days=3)).isoformat() + "T15:10:00+08:00",
             decided_at=(today - timedelta(days=2)).isoformat() + "T09:05:00+08:00"),
        dict(account_id=orgs["HMJ Bisnis Digital"], room_id=rooms["Lab Fashion"], date=saturday.isoformat(),
             start_time="13:00", duration=120, participants=25,
             purpose="Workshop fotografi produk untuk mahasiswa semester 4",
             contact_name="Ni Made Ayu Lestari", contact_nim="2023010234", contact_wa="081234567890",
             status="rejected", rejection_reason="Lab Fashion sedang digunakan untuk kelas praktik tata busana pada jam tersebut. Silakan pilih ruangan atau waktu lain.",
             created_at=(today - timedelta(days=2)).isoformat() + "T11:45:00+08:00",
             decided_at=(today - timedelta(days=1)).isoformat() + "T08:30:00+08:00"),
    ]

    for item in demo:
        label = {
            "purpose": item["purpose"], "org": "Organisasi", "room": "",
            "date": date_label(item["date"]),
            "time": "%s–%s WITA" % (item["start_time"],
                                    fmt_minutes(to_minutes(item["start_time"]) + item["duration"])),
            "participants": item["participants"],
            "contact": item["contact_name"], "wa": item["contact_wa"],
        }
        room_row = conn.execute("SELECT name FROM rooms WHERE id = ?", (item["room_id"],)).fetchone()
        org_row = conn.execute("SELECT name FROM accounts WHERE id = ?", (item["account_id"],)).fetchone()
        label["room"] = room_row["name"] if room_row else "Ruangan"
        label["org"] = org_row["name"] if org_row else "Organisasi"
        pdf = build_proposal_pdf(label)
        fname = "%s.pdf" % uuid.uuid4().hex
        (UPLOAD_DIR / fname).write_bytes(pdf)
        insert_booking(
            conn, attachment_name="Proposal-%s.pdf" % re.sub(r"[^A-Za-z0-9]+", "-", label["room"]),
            attachment_path=fname, **item
        )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class ApiError(Exception):
    def __init__(self, status, message, extra=None):
        super().__init__(message)
        self.status = status
        self.message = message
        self.extra = extra or {}


def now_iso():
    return datetime.now(WITA).isoformat(timespec="seconds")


def local_now():
    return datetime.now(WITA)


def today_iso():
    return local_now().date().isoformat()


def parse_date(value):
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        raise ApiError(400, "Format tanggal tidak valid. Gunakan YYYY-MM-DD.")


def to_minutes(value):
    try:
        hh, mm = [int(x) for x in value.split(":")]
    except (ValueError, AttributeError):
        raise ApiError(400, "Format jam tidak valid.")
    if not (0 <= hh <= 23 and 0 <= mm <= 59):
        raise ApiError(400, "Format jam tidak valid.")
    return hh * 60 + mm


def fmt_minutes(value):
    return "%02d:%02d" % (value // 60, value % 60)


def date_label(iso):
    d = parse_date(iso)
    return "%s, %d %s %d" % (DAY_NAMES[d.weekday()], d.day, MONTH_NAMES[d.month - 1], d.year)


def overlap(start_a, dur_a, start_b, dur_b):
    return start_a < start_b + dur_b and start_b < start_a + dur_a


def find_conflicts(conn, room_id, date, start, duration, exclude_id=None):
    rows = conn.execute(
        "SELECT id, code, start_time, duration, status FROM bookings"
        " WHERE room_id = ? AND date = ? AND status IN ('pending', 'approved')",
        (room_id, date),
    ).fetchall()
    conflicts = []
    for r in rows:
        if exclude_id and r["id"] == exclude_id:
            continue
        s = to_minutes(r["start_time"])
        if overlap(start, duration, s, r["duration"]):
            conflicts.append({
                "start": fmt_minutes(s),
                "end": fmt_minutes(s + r["duration"]),
                "status": r["status"],
            })
    return conflicts


def booking_query(where="", params=()):
    return (
        "SELECT b.*, r.name AS room_name, r.category AS room_category,"
        " r.image AS room_image, r.capacity AS room_capacity, r.location AS room_location,"
        " a.name AS org_name, a.short_name AS org_short, a.role AS org_role"
        " FROM bookings b JOIN rooms r ON r.id = b.room_id JOIN accounts a ON a.id = b.account_id"
        + (" WHERE " + where if where else "") + " ORDER BY b.created_at DESC"
    ), params


def serialize_booking(row):
    d = dict(row)
    start = to_minutes(d["start_time"])
    d["end_time"] = fmt_minutes(start + d["duration"])
    d["date_label"] = date_label(d["date"])
    d["category_label"] = CATEGORY_LABEL.get(d["room_category"], d["room_category"])
    d["attachment_url"] = "/api/bookings/%d/attachment" % d["id"] if d.get("attachment_path") else None
    d["can_download"] = d["status"] == "approved"
    d.pop("attachment_path", None)
    return d


def account_public(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "short_name": row["short_name"],
        "role": row["role"],
        "accent": row["accent"],
        "initials": "".join(w[0] for w in row["short_name"].split()[:2]).upper(),
    }


def client_ip(handler):
    return handler.client_address[0]


LOGIN_ATTEMPTS = {}


def check_rate_limit(ip):
    now = time.time()
    attempts = [t for t in LOGIN_ATTEMPTS.get(ip, []) if now - t < 600]
    LOGIN_ATTEMPTS[ip] = attempts
    if len(attempts) >= 10:
        raise ApiError(429, "Terlalu banyak percobaan. Coba lagi dalam 10 menit.")


def register_attempt(ip):
    LOGIN_ATTEMPTS.setdefault(ip, []).append(time.time())


# ---------------------------------------------------------------------------
# HTTP handler
# ---------------------------------------------------------------------------

class Handler(BaseHTTPRequestHandler):
    server_version = "SIMPENAN/1.0"
    protocol_version = "HTTP/1.1"

    # -- low level ---------------------------------------------------------
    def log_message(self, fmt, *args):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))

    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def send_bytes(self, body, content_type, filename=None, status=200, cache="no-store"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", cache)
        if filename:
            quoted = urllib.parse.quote(filename)
            self.send_header("Content-Disposition", "attachment; filename=\"%s\"; filename*=UTF-8''%s" % (filename, quoted))
        self.end_headers()
        self.wfile.write(body)

    def read_body(self, limit=MAX_UPLOAD + 1024 * 512):
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            raise ApiError(400, "Content-Length tidak valid.")
        if length > limit:
            raise ApiError(413, "Ukuran unggahan terlalu besar. Maksimal 5 MB.")
        return self.rfile.read(length) if length else b""

    def json_body(self):
        raw = self.read_body()
        if not raw:
            return {}
        try:
            data = json.loads(raw.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            raise ApiError(400, "Body JSON tidak valid.")
        if not isinstance(data, dict):
            raise ApiError(400, "Body JSON harus berupa objek.")
        return data

    def form_body(self):
        ctype = self.headers.get("Content-Type", "")
        if ctype.startswith("multipart/form-data"):
            return self.parse_multipart()
        if ctype.startswith("application/json"):
            return self.json_body(), {}, {}
        raw = self.read_body()
        parsed = urllib.parse.parse_qs(raw.decode("utf-8", "replace"))
        return {k: v[0] for k, v in parsed.items()}, {}, {}

    def parse_multipart(self):
        header = self.headers.get("Content-Type", "")
        match = re.search(r"boundary=(?:\"([^\"]+)\"|([^;]+))", header)
        if not match:
            raise ApiError(400, "Boundary multipart tidak ditemukan.")
        boundary = (match.group(1) or match.group(2)).strip().encode()
        body = self.read_body()
        fields, files = {}, {}
        for chunk in body.split(b"--" + boundary):
            if chunk in (b"", b"--", b"--\r\n", b"\r\n") or chunk.startswith(b"--"):
                continue
            if chunk.startswith(b"\r\n"):
                chunk = chunk[2:]
            if chunk.endswith(b"\r\n"):
                chunk = chunk[:-2]
            head, sep, data = chunk.partition(b"\r\n\r\n")
            if not sep:
                continue
            headers_text = head.decode("utf-8", "replace")
            name_match = re.search(r'name="([^"]*)"', headers_text)
            if not name_match:
                continue
            name = name_match.group(1)
            filename_match = re.search(r'filename="([^"]*)"', headers_text)
            if filename_match:
                files[name] = {"filename": filename_match.group(1), "data": data}
            else:
                fields[name] = data.decode("utf-8", "replace")
        return fields, files, {}

    def cookies(self):
        raw = self.headers.get("Cookie")
        jar = SimpleCookie()
        if raw:
            try:
                jar.load(raw)
            except Exception:
                pass
        return jar

    def session_account(self):
        token = self.cookies().get("simpenan_session")
        if not token:
            return None
        token = token.value
        conn = connect()
        row = conn.execute(
            "SELECT a.* FROM sessions s JOIN accounts a ON a.id = s.account_id"
            " WHERE s.token = ? AND s.created_at >= ?",
            (token, (local_now() - timedelta(days=SESSION_DAYS)).isoformat()),
        ).fetchone()
        conn.close()
        return row

    def require_account(self, role=None):
        account = self.session_account()
        if not account:
            raise ApiError(401, "Sesi berakhir. Silakan masuk kembali.")
        if role and account["role"] != role:
            raise ApiError(403, "Anda tidak memiliki akses ke halaman ini.")
        return account

    def check_origin(self):
        origin = self.headers.get("Origin")
        if not origin:
            return
        request_host = (self.headers.get("Host") or "").strip()
        origin_host = urllib.parse.urlparse(origin).netloc
        allowed = {request_host, "localhost:%d" % PORT, "127.0.0.1:%d" % PORT}
        if origin_host not in allowed:
            raise ApiError(403, "Origin tidak diizinkan.")

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        super().end_headers()

    # -- routing -----------------------------------------------------------
    def do_GET(self):
        try:
            self.route_get()
        except ApiError as exc:
            self.send_json({"error": exc.message, **exc.extra}, exc.status)
        except BrokenPipeError:
            pass
        except Exception as exc:  # pragma: no cover
            self.log_error("GET error: %s", exc)
            self.send_json({"error": "Terjadi kesalahan pada server."}, 500)

    def do_POST(self):
        try:
            self.check_origin()
            self.route_post()
        except ApiError as exc:
            self.send_json({"error": exc.message, **exc.extra}, exc.status)
        except BrokenPipeError:
            pass
        except Exception as exc:  # pragma: no cover
            self.log_error("POST error: %s", exc)
            self.send_json({"error": "Terjadi kesalahan pada server."}, 500)

    def do_PATCH(self):
        try:
            self.check_origin()
            self.route_patch()
        except ApiError as exc:
            self.send_json({"error": exc.message, **exc.extra}, exc.status)
        except BrokenPipeError:
            pass
        except Exception as exc:  # pragma: no cover
            self.log_error("PATCH error: %s", exc)
            self.send_json({"error": "Terjadi kesalahan pada server."}, 500)

    def do_DELETE(self):
        try:
            self.check_origin()
            self.route_delete()
        except ApiError as exc:
            self.send_json({"error": exc.message, **exc.extra}, exc.status)
        except BrokenPipeError:
            pass
        except Exception as exc:  # pragma: no cover
            self.log_error("DELETE error: %s", exc)
            self.send_json({"error": "Terjadi kesalahan pada server."}, 500)

    def route_get(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path.startswith("/api/"):
            return self.api_get(path, query)
        if path.startswith("/static/"):
            return self.serve_static(path)
        if path in ("/", "/index.html"):
            return self.serve_file(STATIC / "index.html", "text/html; charset=utf-8")
        if path == "/favicon.ico":
            return self.serve_file(STATIC / "assets" / "logo.svg", "image/svg+xml", cache="public, max-age=86400")
        raise ApiError(404, "Halaman tidak ditemukan.")

    def api_get(self, path, query):
        if path == "/api/health":
            return self.send_json({"ok": True, "time": now_iso()})

        if path == "/api/config":
            return self.send_json({
                "hours": {"open": "08:00", "close": "18:00"},
                "categories": [
                    {"value": "terbuka", "label": "Ruang Terbuka", "days": "Senin – Sabtu"},
                    {"value": "kelas", "label": "Ruang Kelas", "days": "Sabtu"},
                    {"value": "fasilitas", "label": "Ruang Diskusi", "days": "Senin – Jumat"},
                ],
                "today": today_iso(),
                "now": local_now().strftime("%H:%M"),
            })

        if path == "/api/me":
            account = self.require_account()
            return self.send_json({"account": account_public(account)})

        if path == "/api/rooms":
            self.require_account()
            conn = connect()
            rows = conn.execute("SELECT * FROM rooms WHERE active = 1 ORDER BY sort_order, id").fetchall()
            conn.close()
            rooms = []
            for row in rows:
                room = dict(row)
                room["category_label"] = CATEGORY_LABEL.get(room["category"], room["category"])
                room["facilities"] = [x.strip() for x in room["facilities"].split(",") if x.strip()]
                rooms.append(room)
            return self.send_json({"rooms": rooms})

        if path == "/api/availability":
            return self.api_availability(query)

        if path == "/api/bookings/mine":
            account = self.require_account("org")
            sql, params = booking_query("b.account_id = ?", (account["id"],))
            conn = connect()
            rows = conn.execute(sql, params).fetchall()
            conn.close()
            return self.send_json({"bookings": [serialize_booking(r) for r in rows]})

        match = re.match(r"^/api/bookings/(\d+)$", path)
        if match:
            account = self.require_account()
            conn = connect()
            sql, params = booking_query("b.id = ?", (int(match.group(1)),))
            row = conn.execute(sql, params).fetchone()
            conn.close()
            if not row:
                raise ApiError(404, "Peminjaman tidak ditemukan.")
            if account["role"] != "baa" and row["account_id"] != account["id"]:
                raise ApiError(403, "Anda tidak memiliki akses ke peminjaman ini.")
            return self.send_json({"booking": serialize_booking(row)})

        match = re.match(r"^/api/bookings/(\d+)/confirmation\.pdf$", path)
        if match:
            return self.download_confirmation(int(match.group(1)))

        match = re.match(r"^/api/bookings/(\d+)/attachment$", path)
        if match:
            return self.download_attachment(int(match.group(1)))

        if path == "/api/admin/bookings":
            self.require_account("baa")
            status = (query.get("status") or ["all"])[0]
            search = (query.get("q") or [""])[0].strip().lower()
            sql, params = booking_query()
            conn = connect()
            rows = conn.execute(sql, params).fetchall()
            conn.close()
            items = [serialize_booking(r) for r in rows]
            if status in ("pending", "approved", "rejected", "cancelled"):
                items = [b for b in items if b["status"] == status]
            if search:
                haystack = lambda b: " ".join(str(b.get(k, "")) for k in
                                              ("code", "org_name", "room_name", "contact_name", "purpose")).lower()
                items = [b for b in items if search in haystack(b)]
            return self.send_json({"bookings": items})

        if path == "/api/admin/stats":
            account = self.require_account("baa")
            conn = connect()
            counts = {r["status"]: r["count"] for r in conn.execute(
                "SELECT status, COUNT(*) AS count FROM bookings GROUP BY status")}
            active_rooms = conn.execute("SELECT COUNT(*) FROM rooms WHERE active = 1").fetchone()[0]
            pending_sql, pending_params = booking_query("b.status = 'pending'")
            pending_rows = conn.execute(pending_sql + " LIMIT 6", pending_params).fetchall()
            upcoming_sql, upcoming_params = booking_query(
                "b.status = 'approved' AND b.date >= ?", (today_iso(),))
            upcoming_rows = conn.execute(upcoming_sql + " LIMIT 5", upcoming_params).fetchall()
            conn.close()
            return self.send_json({
                "counts": {
                    "pending": counts.get("pending", 0),
                    "approved": counts.get("approved", 0),
                    "rejected": counts.get("rejected", 0),
                    "total": sum(counts.values()),
                },
                "active_rooms": active_rooms,
                "pending": [serialize_booking(r) for r in pending_rows],
                "upcoming": [serialize_booking(r) for r in upcoming_rows],
                "account": account_public(account),
            })

        if path == "/api/admin/rooms":
            self.require_account("baa")
            conn = connect()
            rows = conn.execute(
                "SELECT r.*, (SELECT COUNT(*) FROM bookings b WHERE b.room_id = r.id) AS booking_count"
                " FROM rooms r ORDER BY r.active DESC, r.sort_order, r.id").fetchall()
            conn.close()
            rooms = []
            for row in rows:
                room = dict(row)
                room["category_label"] = CATEGORY_LABEL.get(room["category"], room["category"])
                room["facilities"] = [x.strip() for x in room["facilities"].split(",") if x.strip()]
                rooms.append(room)
            return self.send_json({"rooms": rooms})

        raise ApiError(404, "Endpoint tidak ditemukan.")

    # -- static files ------------------------------------------------------
    def serve_static(self, path):
        rel = urllib.parse.unquote(path[len("/static/"):])
        target = (STATIC / rel).resolve()
        try:
            target.relative_to(STATIC.resolve())
        except ValueError:
            raise ApiError(403, "Akses ditolak.")
        if not target.is_file():
            raise ApiError(404, "Aset tidak ditemukan.")
        ctype = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        cache = "public, max-age=604800" if target.suffix in (".svg", ".png", ".jpg", ".woff2") else "no-cache"
        return self.serve_file(target, ctype, cache=cache)

    def serve_file(self, target, ctype, cache="no-cache"):
        try:
            body = target.read_bytes()
        except FileNotFoundError:
            raise ApiError(404, "File tidak ditemukan.")
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", cache)
        self.end_headers()
        self.wfile.write(body)

    # -- API implementations ----------------------------------------------
    def api_login(self):
        check_rate_limit(client_ip(self))
        data = self.json_body()
        code = str(data.get("code") or "").strip()
        if not re.fullmatch(r"\d{4}", code):
            register_attempt(client_ip(self))
            raise ApiError(400, "Passcode harus terdiri dari 4 digit angka.")
        conn = connect()
        accounts = conn.execute("SELECT * FROM accounts").fetchall()
        found = None
        for account in accounts:
            if hmac.compare_digest(hash_code(code, account["salt"]), account["code_hash"]):
                found = account
                break
        if not found:
            conn.close()
            register_attempt(client_ip(self))
            raise ApiError(401, "Passcode tidak dikenali. Periksa kembali kode organisasi Anda.")
        LOGIN_ATTEMPTS.pop(client_ip(self), None)
        token = secrets.token_urlsafe(32)
        conn.execute("DELETE FROM sessions WHERE created_at < ?",
                     ((local_now() - timedelta(days=SESSION_DAYS)).isoformat(),))
        conn.execute("INSERT INTO sessions (token, account_id, created_at) VALUES (?, ?, ?)",
                     (token, found["id"], now_iso()))
        conn.commit()
        conn.close()
        cookie = "simpenan_session=%s; Path=/; HttpOnly; SameSite=Lax; Max-Age=%d" % (
            token, SESSION_DAYS * 86400)
        self.send_response(200)
        payload = json.dumps({"account": account_public(found)}).encode()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Set-Cookie", cookie)
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)
        return None

    def api_logout(self):
        token = self.cookies().get("simpenan_session")
        if token:
            conn = connect()
            conn.execute("DELETE FROM sessions WHERE token = ?", (token.value,))
            conn.commit()
            conn.close()
        self.send_response(204)
        self.send_header("Set-Cookie", "simpenan_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0")
        self.send_header("Content-Length", "0")
        self.end_headers()
        return None

    def api_availability(self, query):
        self.require_account()
        date_raw = (query.get("date") or [""])[0]
        start_raw = (query.get("start") or [""])[0]
        try:
            duration = int((query.get("duration") or ["0"])[0])
            participants = int((query.get("participants") or ["0"])[0])
        except ValueError:
            raise ApiError(400, "Durasi atau jumlah peserta tidak valid.")

        d = parse_date(date_raw)
        start = to_minutes(start_raw)
        if duration < 30 or duration > 600 or duration % 30:
            raise ApiError(400, "Durasi harus kelipatan 30 menit (30–600 menit).")
        if start < DAY_START or start + duration > DAY_END:
            raise ApiError(400, "Waktu harus berada di antara 08:00 dan 18:00.")
        if participants < 1:
            raise ApiError(400, "Jumlah peserta minimal 1 orang.")
        if d < local_now().date():
            raise ApiError(400, "Tanggal yang dipilih sudah lewat.")
        if d == local_now().date() and start < local_now().hour * 60 + local_now().minute:
            raise ApiError(400, "Jam mulai sudah lewat. Pilih waktu setelah sekarang.")

        conn = connect()
        rooms = conn.execute("SELECT * FROM rooms WHERE active = 1 ORDER BY sort_order, id").fetchall()
        conn.close()
        result = []
        weekday = d.weekday()
        for row in rooms:
            room = dict(row)
            room["category_label"] = CATEGORY_LABEL.get(room["category"], room["category"])
            room["facilities"] = [x.strip() for x in room["facilities"].split(",") if x.strip()]
            allowed_days = CATEGORY_DAYS.get(room["category"], [])
            reasons = []
            if weekday not in allowed_days:
                reasons.append("Hanya tersedia pada hari %s" % CATEGORY_DAYS_LABEL.get(
                    room["category"], "Senin–Sabtu"))
            if participants > room["capacity"]:
                reasons.append("Kapasitas maksimal %d orang" % room["capacity"])
            room["available"] = not reasons
            room["reasons"] = reasons
            room["conflicts"] = []
            result.append(room)

        conn = connect()
        for room in result:
            if room["available"]:
                conflicts = find_conflicts(conn, room["id"], d.isoformat(), start, duration)
                room["conflicts"] = conflicts
                if conflicts:
                    room["available"] = False
                    room["reasons"] = ["Sudah dipesan pada %s" % ", ".join(
                        "%s–%s" % (c["start"], c["end"]) for c in conflicts)]
        conn.close()
        return self.send_json({
            "date": d.isoformat(),
            "date_label": date_label(d.isoformat()),
            "day_name": DAY_NAMES[d.weekday()],
            "start": fmt_minutes(start),
            "end": fmt_minutes(start + duration),
            "duration": duration,
            "participants": participants,
            "rooms": result,
        })

    def api_create_booking(self):
        account = self.require_account("org")
        fields, files, _ = self.form_body()

        room_id_raw = fields.get("room_id")
        try:
            room_id = int(room_id_raw)
            participants = int(fields.get("participants", "0"))
        except (TypeError, ValueError):
            raise ApiError(400, "Data ruangan atau peserta tidak valid.")

        date_raw = (fields.get("date") or "").strip()
        start_raw = (fields.get("start") or "").strip()
        try:
            duration = int(fields.get("duration", "0"))
        except ValueError:
            raise ApiError(400, "Durasi tidak valid.")
        purpose = (fields.get("purpose") or "").strip()
        contact_name = (fields.get("contact_name") or "").strip()
        contact_nim = (fields.get("contact_nim") or "").strip()
        contact_wa = re.sub(r"[^\d+]", "", (fields.get("contact_wa") or "").strip())
        contact_wa = contact_wa.lstrip("+")

        if not purpose or len(purpose) < 10:
            raise ApiError(400, "Deskripsi tujuan minimal 10 karakter.", {"field": "purpose"})
        if len(purpose) > 600:
            raise ApiError(400, "Deskripsi tujuan maksimal 600 karakter.", {"field": "purpose"})
        if len(contact_name) < 3:
            raise ApiError(400, "Nama kontak person minimal 3 karakter.", {"field": "contact_name"})
        if not re.fullmatch(r"\d{6,20}", contact_nim):
            raise ApiError(400, "NIM harus berupa 6–20 digit angka.", {"field": "contact_nim"})
        if not re.fullmatch(r"\d{9,15}", contact_wa):
            raise ApiError(400, "Nomor WhatsApp harus 9–15 digit.", {"field": "contact_wa"})

        d = parse_date(date_raw)
        start = to_minutes(start_raw)
        if duration < 30 or duration > 600 or duration % 30:
            raise ApiError(400, "Durasi harus kelipatan 30 menit (30–600 menit).")
        if start < DAY_START or start + duration > DAY_END:
            raise ApiError(400, "Waktu harus berada di antara 08:00 dan 18:00.")
        if d < local_now().date():
            raise ApiError(400, "Tanggal yang dipilih sudah lewat.")
        if d == local_now().date() and start < local_now().hour * 60 + local_now().minute:
            raise ApiError(400, "Jam mulai sudah lewat. Pilih waktu setelah sekarang.")

        conn = connect()
        room = conn.execute("SELECT * FROM rooms WHERE id = ? AND active = 1", (room_id,)).fetchone()
        if not room:
            conn.close()
            raise ApiError(404, "Ruangan tidak tersedia.")
        if d.weekday() not in CATEGORY_DAYS.get(room["category"], []):
            conn.close()
            raise ApiError(400, "Ruangan ini tidak tersedia pada tanggal tersebut.")
        if participants < 1 or participants > room["capacity"]:
            conn.close()
            raise ApiError(400, "Jumlah peserta melebihi kapasitas ruangan (%d orang)." % room["capacity"])
        conflicts = find_conflicts(conn, room_id, d.isoformat(), start, duration)
        if conflicts:
            conn.close()
            raise ApiError(409, "Ruangan sudah dipesan pada jam tersebut. Silakan pilih waktu atau ruangan lain.")
        conn.close()

        file_info = files.get("attachment")
        safe_name = None
        stored_name = None
        if file_info and file_info.get("filename"):
            if not file_info["filename"].lower().endswith(".pdf"):
                raise ApiError(400, "Lampiran harus berformat PDF.", {"field": "attachment"})
            if len(file_info["data"]) > MAX_UPLOAD:
                raise ApiError(413, "Ukuran PDF maksimal 5 MB.", {"field": "attachment"})
            if not file_info["data"].startswith(b"%PDF"):
                raise ApiError(400, "File PDF tidak valid.", {"field": "attachment"})
            safe_name = re.sub(r"[^A-Za-z0-9._-]+", "-", file_info["filename"])[:100]
            stored_name = uuid.uuid4().hex + ".pdf"
            (UPLOAD_DIR / stored_name).write_bytes(file_info["data"])

        conn = connect()
        booking_id = insert_booking(
            conn, account_id=account["id"], room_id=room_id, date=d.isoformat(),
            start_time=fmt_minutes(start), duration=duration, participants=participants,
            purpose=purpose, contact_name=contact_name, contact_nim=contact_nim,
            contact_wa=contact_wa, attachment_name=safe_name, attachment_path=stored_name,
        )
        sql, params = booking_query("b.id = ?", (booking_id,))
        row = conn.execute(sql, params).fetchone()
        conn.close()
        return self.send_json({"booking": serialize_booking(row)}, 201)

    def api_decision(self, booking_id):
        account = self.require_account("baa")
        data = self.json_body()
        action = data.get("action")
        reason = (data.get("reason") or "").strip()
        if action not in ("approve", "reject"):
            raise ApiError(400, "Aksi harus approve atau reject.")
        if action == "reject" and len(reason) < 5:
            raise ApiError(400, "Alasan penolakan minimal 5 karakter.", {"field": "reason"})

        conn = connect()
        row = conn.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
        if not row:
            conn.close()
            raise ApiError(404, "Peminjaman tidak ditemukan.")
        if row["status"] != "pending":
            conn.close()
            raise ApiError(409, "Peminjaman ini sudah diproses sebelumnya.")

        if action == "approve":
            conflicts = find_conflicts(
                conn, row["room_id"], row["date"], to_minutes(row["start_time"]),
                row["duration"], exclude_id=booking_id)
            if conflicts:
                conn.close()
                raise ApiError(409, "Tidak dapat menyetujui: jadwal bentrok dengan peminjaman lain (%s)."
                               % ", ".join("%s–%s" % (c["start"], c["end"]) for c in conflicts))
            conn.execute(
                "UPDATE bookings SET status = 'approved', rejection_reason = NULL, decided_at = ? WHERE id = ?",
                (now_iso(), booking_id))
        else:
            conn.execute(
                "UPDATE bookings SET status = 'rejected', rejection_reason = ?, decided_at = ? WHERE id = ?",
                (reason, now_iso(), booking_id))
        conn.commit()
        sql, params = booking_query("b.id = ?", (booking_id,))
        updated = conn.execute(sql, params).fetchone()
        conn.close()
        return self.send_json({"booking": serialize_booking(updated)})

    def download_confirmation(self, booking_id):
        account = self.require_account()
        conn = connect()
        sql, params = booking_query("b.id = ?", (booking_id,))
        row = conn.execute(sql, params).fetchone()
        conn.close()
        if not row:
            raise ApiError(404, "Peminjaman tidak ditemukan.")
        if account["role"] != "baa" and row["account_id"] != account["id"]:
            raise ApiError(403, "Anda tidak memiliki akses ke dokumen ini.")
        if row["status"] != "approved":
            raise ApiError(409, "Surat konfirmasi hanya tersedia untuk peminjaman yang sudah disetujui.")

        data = serialize_booking(row)
        pdf = build_confirmation_pdf({
            "code": data["code"],
            "org": data["org_name"],
            "room": data["room_name"],
            "category": data["category_label"],
            "date": data["date_label"],
            "time": "%s – %s WITA" % (data["start_time"], data["end_time"]),
            "participants": data["participants"],
            "capacity": data["room_capacity"],
            "contact": data["contact_name"],
            "nim": data["contact_nim"],
            "wa": data["contact_wa"],
            "purpose": data["purpose"],
            "issued": today_label(),
        })
        return self.send_bytes(pdf, "application/pdf",
                               "Konfirmasi-%s.pdf" % data["code"])

    def download_attachment(self, booking_id):
        account = self.require_account()
        conn = connect()
        row = conn.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
        conn.close()
        if not row:
            raise ApiError(404, "Peminjaman tidak ditemukan.")
        if account["role"] != "baa" and row["account_id"] != account["id"]:
            raise ApiError(403, "Anda tidak memiliki akses ke lampiran ini.")
        if not row["attachment_path"]:
            raise ApiError(404, "Lampiran tidak tersedia.")
        path = (UPLOAD_DIR / row["attachment_path"]).resolve()
        try:
            path.relative_to(UPLOAD_DIR.resolve())
        except ValueError:
            raise ApiError(403, "Akses ditolak.")
        if not path.is_file():
            raise ApiError(404, "File lampiran tidak ditemukan.")
        body = path.read_bytes()
        name = row["attachment_name"] or "lampiran.pdf"
        self.send_response(200)
        self.send_header("Content-Type", "application/pdf")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Content-Disposition", "inline; filename=\"%s\"" % name.encode("ascii", "replace").decode())
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)
        return None

    # -- POST routes -------------------------------------------------------
    def route_post(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path == "/api/auth/login":
            return self.api_login()
        if path == "/api/auth/logout":
            return self.api_logout()
        if path == "/api/bookings":
            return self.api_create_booking()
        match = re.match(r"^/api/admin/bookings/(\d+)/decision$", path)
        if match:
            return self.api_decision(int(match.group(1)))
        if path == "/api/admin/rooms":
            return self.api_create_room()
        raise ApiError(404, "Endpoint tidak ditemukan.")

    def route_patch(self):
        parsed = urllib.parse.urlparse(self.path)
        match = re.match(r"^/api/admin/rooms/(\d+)$", parsed.path)
        if match:
            return self.api_update_room(int(match.group(1)))
        raise ApiError(404, "Endpoint tidak ditemukan.")

    def route_delete(self):
        parsed = urllib.parse.urlparse(self.path)
        match = re.match(r"^/api/admin/rooms/(\d+)$", parsed.path)
        if match:
            return self.api_delete_room(int(match.group(1)))
        raise ApiError(404, "Endpoint tidak ditemukan.")

    def _room_payload(self):
        fields, files, _ = self.form_body()
        name = (fields.get("name") or "").strip()
        category = (fields.get("category") or "").strip()
        location = (fields.get("location") or "").strip()
        description = (fields.get("description") or "").strip()
        facilities = (fields.get("facilities") or "").strip()
        active = fields.get("active", "1")
        try:
            capacity = int(fields.get("capacity", "0"))
        except (TypeError, ValueError):
            raise ApiError(400, "Kapasitas harus berupa angka.")
        if len(name) < 2:
            raise ApiError(400, "Nama ruangan minimal 2 karakter.")
        if category not in ("terbuka", "kelas", "fasilitas"):
            raise ApiError(400, "Kategori ruangan tidak valid.")
        if not (1 <= capacity <= 1000):
            raise ApiError(400, "Kapasitas harus antara 1 dan 1000 orang.")
        return {
            "name": name,
            "category": category,
            "capacity": capacity,
            "location": location or ("Gedung IDB Bali"),
            "description": description,
            "facilities": facilities,
            "image": ROOM_ART.get(category, ROOM_ART["terbuka"]),
            "active": 1 if str(active) not in ("0", "false", "False", "") else 0,
        }

    def api_create_room(self):
        self.require_account("baa")
        payload = self._room_payload()
        conn = connect()
        next_sort = conn.execute("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM rooms").fetchone()[0]
        conn.execute(
            "INSERT INTO rooms (name, category, capacity, location, description, facilities, image, active, sort_order, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (payload["name"], payload["category"], payload["capacity"], payload["location"],
             payload["description"], payload["facilities"], payload["image"], payload["active"],
             next_sort, now_iso()),
        )
        conn.commit()
        room_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        row = conn.execute("SELECT * FROM rooms WHERE id = ?", (room_id,)).fetchone()
        conn.close()
        room = dict(row)
        room["category_label"] = CATEGORY_LABEL.get(room["category"], room["category"])
        room["facilities"] = [x.strip() for x in room["facilities"].split(",") if x.strip()]
        return self.send_json({"room": room}, 201)

    def api_update_room(self, room_id):
        self.require_account("baa")
        payload = self._room_payload()
        conn = connect()
        row = conn.execute("SELECT id FROM rooms WHERE id = ?", (room_id,)).fetchone()
        if not row:
            conn.close()
            raise ApiError(404, "Ruangan tidak ditemukan.")
        conn.execute(
            "UPDATE rooms SET name = ?, category = ?, capacity = ?, location = ?, description = ?,"
            " facilities = ?, active = ? WHERE id = ?",
            (payload["name"], payload["category"], payload["capacity"], payload["location"],
             payload["description"], payload["facilities"], payload["active"], room_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM rooms WHERE id = ?", (room_id,)).fetchone()
        conn.close()
        room = dict(row)
        room["category_label"] = CATEGORY_LABEL.get(room["category"], room["category"])
        room["facilities"] = [x.strip() for x in room["facilities"].split(",") if x.strip()]
        return self.send_json({"room": room})

    def api_delete_room(self, room_id):
        self.require_account("baa")
        conn = connect()
        row = conn.execute("SELECT * FROM rooms WHERE id = ?", (room_id,)).fetchone()
        if not row:
            conn.close()
            raise ApiError(404, "Ruangan tidak ditemukan.")
        active_rooms = conn.execute("SELECT COUNT(*) FROM rooms WHERE active = 1").fetchone()[0]
        if active_rooms <= 1:
            conn.close()
            raise ApiError(409, "Minimal harus ada satu ruangan aktif.")
        conn.execute("UPDATE rooms SET active = 0 WHERE id = ?", (room_id,))
        conn.commit()
        conn.close()
        return self.send_json({"ok": True})


def main():
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print("\n  SIMPENAN — Sistem Peminjaman Ruangan IDB Bali")
    print("  ------------------------------------------------")
    print("  Server berjalan di: http://%s:%d" % (HOST, PORT))
    print("  Login demo: HMJ Bisnis Digital 1234 · UKM Thunder 4321 · BAA 0000")
    print("  Tekan Ctrl+C untuk berhenti.\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Server dihentikan.")
        server.server_close()


if __name__ == "__main__":
    main()
