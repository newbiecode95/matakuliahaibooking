"""Minimal, dependency-free PDF writer for SIMPENAN confirmation letters."""

import re
from datetime import datetime

TEAL = (0.105, 0.400, 0.463)
TEAL_DARK = (0.070, 0.278, 0.329)
ORANGE = (0.949, 0.627, 0.219)
INK = (0.075, 0.129, 0.149)
MUTED = (0.365, 0.451, 0.475)
CREAM = (0.976, 0.965, 0.941)
CARD = (0.965, 0.953, 0.925)
LINE = (0.882, 0.855, 0.804)
WHITE = (1.0, 1.0, 1.0)
GREEN = (0.118, 0.478, 0.361)


def _esc(text):
    text = str(text or "")
    for src, dst in (("\u2013", "-"), ("\u2014", "-"), ("\u00b7", "|"), ("\u2019", "'"),
                     ("\u201c", '"'), ("\u201d", '"'), ("\u2022", "-")):
        text = text.replace(src, dst)
    text = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    text = text.replace("\r", " ").replace("\n", " ")
    return text


def _color(rgb):
    return "%.3f %.3f %.3f" % rgb


def _wrap(text, width=88):
    words = str(text or "").split()
    lines, current = [], ""
    for word in words:
        candidate = (current + " " + word).strip()
        if len(candidate) <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [""]


class _Canvas:
    def __init__(self):
        self.ops = []

    def rect(self, x, y, w, h, fill, stroke=None, line_width=0.8, radius=None):
        self.ops.append("q")
        if fill:
            self.ops.append("%s rg" % _color(fill))
        if stroke:
            self.ops.append("%s RG" % _color(stroke))
            self.ops.append("%.2f w" % line_width)
        if radius:
            r = radius
            path = [
                "%.2f %.2f m" % (x + r, y),
                "%.2f %.2f l" % (x + w - r, y),
                "%.2f %.2f %.2f %.2f %.2f %.2f c" % (x + w, y, x + w, y, x + w, y + r),
                "%.2f %.2f l" % (x + w, y + h - r),
                "%.2f %.2f %.2f %.2f %.2f %.2f c" % (x + w, y + h, x + w, y + h, x + w - r, y + h),
                "%.2f %.2f l" % (x + r, y + h),
                "%.2f %.2f %.2f %.2f %.2f %.2f c" % (x, y + h, x, y + h, x, y + h - r),
                "%.2f %.2f l" % (x, y + r),
                "%.2f %.2f %.2f %.2f %.2f %.2f c" % (x, y, x, y, x + r, y),
                "h",
            ]
            self.ops.extend(path)
            self.ops.append("B" if (fill and stroke) else ("f" if fill else "S"))
        else:
            self.ops.append("%.2f %.2f %.2f %.2f re" % (x, y, w, h))
            self.ops.append("B" if (fill and stroke) else ("f" if fill else "S"))
        self.ops.append("Q")

    def line(self, x1, y1, x2, y2, color=LINE, width=0.8):
        self.ops.append("q %s RG %.2f w %.2f %.2f m %.2f %.2f l S Q" % (_color(color), width, x1, y1, x2, y2))

    def circle(self, cx, cy, r, fill):
        k = 0.5522847498 * r
        self.ops.append("q %s rg" % _color(fill))
        self.ops.append(
            "%.2f %.2f m "
            "%.2f %.2f %.2f %.2f %.2f %.2f c "
            "%.2f %.2f %.2f %.2f %.2f %.2f c "
            "%.2f %.2f %.2f %.2f %.2f %.2f c "
            "%.2f %.2f %.2f %.2f %.2f %.2f c f Q"
            % (
                cx + r, cy,
                cx + r, cy + k, cx + k, cy + r, cx, cy + r,
                cx - k, cy + r, cx - r, cy + k, cx - r, cy,
                cx - r, cy - k, cx - k, cy - r, cx, cy - r,
                cx + k, cy - r, cx + r, cy - k, cx + r, cy,
            )
        )

    def text(self, x, y, text, size=10, bold=False, color=INK, align="left", width=0):
        text = str(text or "")
        if align == "center" and width:
            approx = len(text) * size * 0.5
            x = x + (width - approx) / 2.0
        elif align == "right":
            approx = len(text) * size * 0.5
            x = (x + width - approx) if width else (x - approx)
        self.ops.append(
            "BT /%s %.2f Tf %s rg 1 0 0 1 %.2f %.2f Tm (%s) Tj ET"
            % ("F2" if bold else "F1", size, _color(color), x, y, _esc(text))
        )

    def stream(self):
        return "\n".join(self.ops).encode("latin-1", "replace")


def _build_pdf(content_stream, title="Konfirmasi Peminjaman Ruangan"):
    title_esc = _esc(title)
    objects = []
    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    objects.append(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    objects.append(
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
        b"/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>"
    )
    stream = content_stream
    objects.append(b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream")
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")

    out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out += b"%d 0 obj\n" % i + obj + b"\nendobj\n"
    xref_pos = len(out)
    out += b"xref\n0 %d\n" % (len(objects) + 1)
    out += b"0000000000 65535 f \n"
    for off in offsets[1:]:
        out += ("%010d 00000 n \n" % off).encode()
    out += (
        b"trailer\n<< /Size %d /Root 1 0 R /Info << /Title (%s) /Producer (SIMPENAN) >> >>\n"
        b"startxref\n%d\n%%%%EOF\n"
    ) % (len(objects) + 1, title_esc.encode("latin-1", "replace"), xref_pos)
    return bytes(out)


def _header(c, subtitle="Sistem Peminjaman Ruangan"):
    c.rect(0, 742, 595, 100, TEAL)
    c.rect(0, 742, 595, 5, ORANGE)
    c.ops.append("q 0 742 595 100 re W n")
    c.circle(577, 798, 54, TEAL_DARK)
    c.ops.append("Q")
    c.circle(64, 792, 19, WHITE)
    c.text(59.5, 785, "S", 17, True, TEAL)
    c.text(94, 797, "SIMPENAN", 16, True, WHITE)
    c.text(94, 781, subtitle, 8.2, False, (0.85, 0.93, 0.94))
    c.text(547, 753, "IDB BALI", 7.5, True, (0.85, 0.93, 0.94), align="right")


def build_confirmation_pdf(b):
    c = _Canvas()
    _header(c)

    y = 700
    c.text(48, y, "SURAT KONFIRMASI PEMINJAMAN", 8.5, True, ORANGE)
    c.text(48, y - 30, "Peminjaman Ruangan", 26, True, INK)
    c.text(48, y - 52, "No. %s" % b["code"], 10, False, MUTED)
    c.text(547, y - 52, "Diterbitkan %s" % b["issued"], 8.5, False, MUTED, align="right", width=0)
    c.line(48, y - 66, 547, y - 66, LINE, 0.8)

    intro = (
        "Bagian Administrasi Akademik (BAA) Institut Desain dan Bisnis Bali dengan ini "
        "mengonfirmasi bahwa permohonan peminjaman ruangan yang diajukan oleh organisasi "
        "mahasiswa berikut telah disetujui."
    )
    ty = y - 88
    for line in _wrap(intro, 106):
        c.text(48, ty, line, 9.6, False, (0.22, 0.30, 0.32))
        ty -= 14

    top = 560
    c.rect(48, 300, 499, 260, CARD, LINE, 0.8, radius=10)

    rows = [
        ("ORGANISASI", b["org"], "KODE PEMESANAN", b["code"]),
        ("RUANGAN", b["room"], "KATEGORI", b["category"]),
        ("TANGGAL", b["date"], "WAKTU", b["time"]),
        ("JUMLAH PESERTA", "%d orang" % b["participants"], "KAPASITAS RUANGAN", "%d orang" % b["capacity"]),
        ("KONTAK PERSON", b["contact"], "NIM / WHATSAPP", "%s  /  %s" % (b["nim"], b["wa"])),
    ]
    ry = 530
    for index, (left_label, left_value, right_label, right_value) in enumerate(rows):
        c.text(68, ry, left_label, 7, True, MUTED)
        c.text(322, ry, right_label, 7, True, MUTED)
        c.text(68, ry - 15, left_value, 10.5, True, INK)
        c.text(322, ry - 15, right_value, 10.5, True, INK)
        if index < len(rows) - 1:
            c.line(68, ry - 27, 527, ry - 27, LINE, 0.5)
        ry -= 44

    py = 276
    c.text(48, py, "TUJUAN PEMINJAMAN", 7, True, MUTED)
    py -= 18
    for line in _wrap(b["purpose"], 100)[:3]:
        c.text(48, py, line, 9.6, False, (0.22, 0.30, 0.32))
        py -= 13

    c.rect(48, 198, 126, 25, (0.898, 0.957, 0.925), None, radius=6)
    c.text(58, 206, "TERKONFIRMASI", 8, True, GREEN)

    note = (
        "Tunjukkan surat konfirmasi ini kepada petugas saat menggunakan ruangan. Perubahan "
        "atau pembatalan jadwal wajib dikonfirmasi kepada BAA paling lambat 1x24 jam sebelum kegiatan."
    )
    ny = 172
    for line in _wrap(note, 112):
        c.text(48, ny, line, 8.4, False, MUTED)
        ny -= 12

    c.line(48, 118, 547, 118, LINE, 0.8)
    c.text(48, 96, "Bagian Administrasi Akademik", 9.5, True, INK)
    c.text(48, 82, "Institut Desain dan Bisnis Bali", 8.5, False, MUTED)
    c.text(48, 58, "Dokumen ini diterbitkan secara elektronik melalui SIMPENAN dan sah tanpa tanda tangan basah.", 7.2, False, MUTED)
    c.text(547, 96, "BAA IDB Bali", 9.5, True, TEAL, align="right", width=0)
    c.text(547, 82, b["issued"], 8.5, False, MUTED, align="right", width=0)

    return _build_pdf(c.stream())


def build_proposal_pdf(b, decision=None):
    """A lightweight demo proposal attachment so seeded requests have a real PDF."""
    c = _Canvas()
    _header(c, "Lampiran Proposal Kegiatan")
    c.text(48, 700, "PROPOSAL KEGIATAN", 8.5, True, ORANGE)
    c.text(48, 670, b["purpose"][:48], 21, True, INK)
    c.text(48, 648, "Diajukan oleh %s" % b["org"], 10, False, MUTED)
    c.line(48, 632, 547, 632, LINE)

    meta = [
        ("RUANGAN", b["room"]),
        ("TANGGAL", b["date"]),
        ("WAKTU", b["time"]),
        ("PESERTA", "%d orang" % b["participants"]),
        ("KONTAK", "%s · %s" % (b["contact"], b["wa"])),
    ]
    y = 600
    for label, value in meta:
        c.text(48, y, label, 7.5, True, MUTED)
        c.text(170, y, value, 10, True, INK)
        y -= 26

    c.text(48, 430, "RINGKASAN KEGIATAN", 7.5, True, MUTED)
    body = (
        "Kegiatan ini diselenggarakan oleh %s sebagai bagian dari program kerja organisasi. "
        "Ruangan dibutuhkan untuk mendukung jalannya acara, termasuk kebutuhan peserta, "
        "peralatan presentasi, dan dokumentasi. Kami berkomitmen menjaga kebersihan, ketertiban, "
        "serta mematuhi seluruh ketentuan penggunaan fasilitas kampus IDB Bali."
    ) % b["org"]
    y = 410
    for line in _wrap(body, 100):
        c.text(48, y, line, 10, False, (0.22, 0.30, 0.32))
        y -= 15

    if decision:
        c.text(48, 240, decision, 9, True, MUTED)

    c.line(48, 118, 547, 118, LINE)
    c.text(48, 96, "Lampiran demo SIMPENAN", 8.5, True, INK)
    c.text(48, 82, "Dokumen contoh untuk keperluan pratinjau.", 8.5, False, MUTED)
    return _build_pdf(c.stream(), "Proposal Kegiatan")


def today_label():
    months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli",
              "Agustus", "September", "Oktober", "November", "Desember"]
    now = datetime.now()
    return "%d %s %d" % (now.day, months[now.month - 1], now.year)
