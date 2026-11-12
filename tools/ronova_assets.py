"""Draw the Ronova motif kit in VectorCraft (headless, through its command API) and export
.vectorcraft / .svg / .png into assets/ronova/vector/.

    python tools/ronova_assets.py

Shapes follow the official Ronova art: the paired crimson head blades with a gem window,
the flame-blade wings with glowing eyes, the great eye's star-petal pupil, the watching eyes
of her domain, and the eight-petal emblem behind her on the character card.
"""
import json, math, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "ronova", "vector")
CLI = os.environ.get("VECTORCRAFT_CLI", r"E:/VectorCraft/vectorcraft-cli.exe")

INK, BONE, SCLERA = "#14030a", "#f6e6e2", "#ecd2cc"
CR, CR_L, CR_D, CR_DD = "#c1202f", "#ff5a5f", "#6e0b19", "#33050c"


# ---------------------------------------------------------------- geometry
def P(x, y):
    return f"{x:.2f} {y:.2f}"


def rot(pts, ang, cx=0.0, cy=0.0):
    a = math.radians(ang)
    c, s = math.cos(a), math.sin(a)
    return [(cx + x * c - y * s, cy + x * s + y * c) for x, y in pts]


def poly(pts):
    return "M" + " L".join(P(*p) for p in pts) + "Z"


def smooth(pts, closed=True, k=0.5):
    """Catmull-Rom through the points, as cubic Béziers."""
    n = len(pts)
    seq = pts + pts[:3] if closed else [pts[0]] + pts + [pts[-1]]
    d = "M" + P(*seq[1] if closed else pts[0])
    rng = range(1, n + 1) if closed else range(1, n)
    for i in rng:
        p0, p1, p2, p3 = seq[i - 1], seq[i], seq[i + 1], seq[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) * k / 3, p1[1] + (p2[1] - p0[1]) * k / 3)
        c2 = (p2[0] - (p3[0] - p1[0]) * k / 3, p2[1] - (p3[1] - p1[1]) * k / 3)
        d += f" C{P(*c1)} {P(*c2)} {P(*p2)}"
    return d + ("Z" if closed else "")


def almond(cx, cy, w, h, ang=0.0):
    """Eye shape, w wide and h tall, rotated ang degrees."""
    k = h / 2 / 0.75
    pts = [(-w / 2, 0), (-w / 4, -k), (w / 4, -k), (w / 2, 0), (w / 4, k), (-w / 4, k)]
    a, b, c_, d_, e, f = rot(pts, ang, cx, cy)
    return f"M{P(*a)} C{P(*b)} {P(*c_)} {P(*d_)} C{P(*e)} {P(*f)} {P(*a)}Z"


def star(cx, cy, n, r_out, r_in, ang=-90.0):
    pts = []
    for i in range(n * 2):
        r = r_out if i % 2 == 0 else r_in
        a = math.radians(ang + i * 180.0 / n)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return poly(pts)


def kite(cx, cy, a, r_in, r_mid, r_tip, half):
    pt = lambda r, deg: (cx + r * math.cos(math.radians(deg)), cy + r * math.sin(math.radians(deg)))
    return poly([pt(r_in, a), pt(r_mid, a - half), pt(r_tip, a), pt(r_mid, a + half)])


def blade(L, W, bend, thorns=(), samples=22):
    """A flame-feather blade from (0,0) to (L,0) along an S-curve, as outline points plus helpers."""
    def centre(t):
        return (t * L, math.sin(t * math.pi * 1.15) * bend * L * (1 - 0.35 * t))

    def tangent(t):
        e = 1e-3
        a, b = centre(max(t - e, 0)), centre(min(t + e, 1))
        n = math.hypot(b[0] - a[0], b[1] - a[1]) or 1
        return ((b[0] - a[0]) / n, (b[1] - a[1]) / n)

    def width(t):
        return W * (math.sin(math.pi * min(1, t ** 0.62)) ** 0.9) * (1 - 0.15 * t) + 1.2

    upper, lower = [], []
    for i in range(samples + 1):
        t = i / samples
        (x, y), (tx, ty) = centre(t), tangent(t)
        nx, ny = -ty, tx
        w = width(t)
        upper.append((x + nx * w, y + ny * w))
        lower.append((x - nx * w * 0.8, y - ny * w * 0.8))
        for tt, size in thorns:                       # a thorn hooks off the lower edge
            if abs(t - tt) < 0.5 / samples:
                lower.append((x - nx * (w * 0.8 + size) + tx * size * 0.9, y - ny * (w * 0.8 + size) + ty * size * 0.9))
    outline = upper + list(reversed(lower[1:]))
    return outline, centre, tangent, width


def place(pts, ang, ox, oy, mirror_x=None):
    out = rot(pts, ang, ox, oy)
    if mirror_x is not None:
        out = [(2 * mirror_x - x, y) for x, y in out]
    return out


# ---------------------------------------------------------------- command builder
class Doc:
    def __init__(self, name, w, h):
        self.name, self.cmds = name, []
        self.add("file.new", {"name": name, "width": w, "height": h, "units": "Pixels", "backgroundContents": "transparent"})

    def add(self, command, params):
        self.cmds.append({"command": command, "params": params})
        return len(self.cmds) - 1

    out, exports = None, (".vectorcraft", ".svg", ".png")

    def shape(self, d, fill=None, grad=None, stroke=None, sw=None, opacity=None, name=None, cap="round", join="round", dash=None, miter=None):
        i = self.add("path.create", {"d": d})
        ref = f"${i}.id"
        if grad:
            self.add("paint.setFill", {"ids": [ref], "gradient": grad})
        elif fill:
            self.add("paint.setFill", {"ids": [ref], "color": fill})
        else:
            self.add("paint.setFill", {"ids": [ref], "none": True})
        if stroke:
            self.add("paint.setStroke", {"ids": [ref], "color": stroke})
            self.add("select.set", {"ids": [ref]})
            opts = {"weight": sw or 1, "join": join, "cap": cap}
            if dash:
                opts["dash"] = dash
            if miter:
                opts["miterLimit"] = miter
            self.add("stroke.set", opts)
        else:
            self.add("paint.setStroke", {"ids": [ref], "none": True})
        if opacity is not None:
            self.add("transparency.set", {"ids": [ref], "opacity": opacity})
        if name:
            self.add("object.setProps", {"ids": [ref], "name": name})
        return ref


def lin(stops, start, end):
    return {"kind": "linear", "stops": [{"offset": o, "color": c, **({"opacity": a} if a is not None else {})} for o, c, a in stops], "start": list(start), "end": list(end)}


def rad(stops, c, r):
    return {"kind": "radial", "stops": [{"offset": o, "color": col, **({"opacity": a} if a is not None else {})} for o, col, a in stops], "start": list(c), "end": [c[0] + r, c[1]]}


def glow(doc, cx, cy, r, core="#fff2ee", mid=CR_L):
    doc.shape(almond(cx, cy, r * 2, r * 2) if False else circle(cx, cy, r),
              grad=rad([(0, core, 1), (0.25, mid, 0.85), (1, mid, 0)], (cx, cy), r))


def circle(cx, cy, r):
    k = 0.5523 * r
    return (f"M{P(cx + r, cy)} C{P(cx + r, cy + k)} {P(cx + k, cy + r)} {P(cx, cy + r)} "
            f"C{P(cx - k, cy + r)} {P(cx - r, cy + k)} {P(cx - r, cy)} C{P(cx - r, cy - k)} {P(cx - k, cy - r)} {P(cx, cy - r)} "
            f"C{P(cx + k, cy - r)} {P(cx + r, cy - k)} {P(cx + r, cy)}Z")


# ---------------------------------------------------------------- assets
def sigil():
    d = Doc("ronova-sigil", 512, 512)
    c = (256, 256)
    d.shape(circle(*c, 236), fill=CR_DD, opacity=55)
    d.shape(circle(*c, 230), stroke=CR, sw=6)
    d.shape(circle(*c, 214), stroke=CR_L, sw=1.5, opacity=60)
    for k in range(8):                                   # minor petals between the great ones
        d.shape(kite(*c, -90 + 22.5 + k * 45, 74, 104, 158, 9), fill=CR_D)
    for k in range(8):                                   # the eight great petals
        a = -90 + k * 45
        d.shape(kite(*c, a, 70, 122, 204, 12), grad=lin([(0, CR_D, None), (1, CR_L, None)],
                (c[0] + 70 * math.cos(math.radians(a)), c[1] + 70 * math.sin(math.radians(a))),
                (c[0] + 204 * math.cos(math.radians(a)), c[1] + 204 * math.sin(math.radians(a)))), stroke=INK, sw=2)
        d.shape(kite(*c, a, 96, 128, 176, 4.5), fill=BONE, opacity=35)
    d.shape(star(*c, 8, 72, 30), fill=BONE, stroke=CR, sw=3)
    d.shape(star(*c, 8, 40, 18, -90 + 22.5), fill=CR)
    d.shape(circle(*c, 9), fill=INK)
    return d


def ornament():
    d = Doc("ronova-ornament", 512, 512)
    # one head blade, pointing up, slightly curved outward (local coords)
    # asymmetric: the outer edge bulges, the inner edge curves in, the tip hooks outward
    outer = [(30, -214), (62, -150), (84, -60), (86, 20), (64, 104), (24, 172), (-8, 198), (-30, 150), (-42, 70), (-38, -10), (-20, -96), (6, -168)]
    inner = [(26, -176), (50, -124), (66, -52), (66, 16), (48, 86), (18, 140), (-4, 160), (-18, 124), (-26, 64), (-22, -4), (-8, -80), (12, -140)]
    gem_out = [(0, -22), (40, 38), (0, 104), (-40, 38)]
    gem_in = [(0, 0), (24, 40), (0, 82), (-24, 40)]
    pupil = [(0, 26), (8, 42), (0, 58), (-8, 42)]
    for side in (-1, 1):
        ang, ox = 16 * side, 256 + 92 * side
        tf = lambda pts: [(ox + (x * side), y) for x, y in rot(pts, ang)]
        tf2 = lambda pts: [(x, y + 256) for x, y in tf(pts)]
        d.shape(smooth(tf2(outer)), grad=lin([(0, CR_L, None), (0.55, CR, None), (1, CR_D, None)], (ox, 50), (ox, 452)), stroke=INK, sw=6)
        d.shape(smooth(tf2(inner)), stroke="#ff9a9a", sw=2.5, opacity=55)
        d.shape(poly(tf2(gem_out)), fill=CR_DD, stroke=INK, sw=3)
        d.shape(poly(tf2(gem_in)), grad=lin([(0, "#ffffff", None), (1, "#e7c2bd", None)], (ox, 256), (ox, 340)))
        d.shape(poly(tf2(pupil)), fill=CR)
    return d


def great_eye():
    d = Doc("ronova-great-eye", 768, 512)
    cx, cy = 384, 256
    # flame crown rising from the lid, as in her domain
    crown = [(cx - 120, cy - 92), (cx - 70, cy - 150), (cx - 40, cy - 118), (cx - 8, cy - 196), (cx + 26, cy - 126), (cx + 60, cy - 168), (cx + 84, cy - 110), (cx + 130, cy - 92)]
    d.shape(smooth(crown + [(cx + 60, cy - 70), (cx - 60, cy - 70)]), fill=INK)
    d.shape(almond(cx, cy, 700, 300), fill=INK)                                   # socket
    d.shape(almond(cx, cy, 632, 256), stroke=CR_L, sw=2, opacity=45)              # rim light
    d.shape(almond(cx, cy, 600, 236), grad=rad([(0, "#fdf0ec", None), (0.7, "#e3bdb7", None), (1, "#a8706e", None)], (cx, cy - 20), 320))
    d.shape(circle(cx, cy, 112), grad=rad([(0, "#9c1428", None), (0.75, "#5c0612", None), (1, "#2a0309", None)], (cx, cy), 112))
    for k in range(20):                                                           # ticks round the iris rim
        a = math.radians(k * 18)
        p1 = (cx + 92 * math.cos(a), cy + 92 * math.sin(a))
        p2 = (cx + 104 * math.cos(a), cy + 104 * math.sin(a))
        d.shape(f"M{P(*p1)} L{P(*p2)}", stroke="#e2434f", sw=4)
    for k in range(12):                                                           # long star petals
        d.shape(kite(cx, cy, -90 + k * 30, 16, 34, 82, 8), fill="#f07a7a")
    for k in range(12):                                                           # short petals between them
        d.shape(kite(cx, cy, -90 + 15 + k * 30, 14, 26, 52, 7), fill="#c8324a")
    d.shape(circle(cx, cy, 40), grad=rad([(0, "#ffffff", 1), (0.35, "#ffd9cc", 0.9), (1, CR_L, 0)], (cx, cy), 40))
    d.shape(circle(cx - 34, cy - 40, 12), fill="#ffffff", opacity=70)
    return d


def watcher():
    d = Doc("ronova-watcher", 512, 256)
    cx, cy = 256, 128
    d.shape(almond(cx, cy, 440, 170), fill=INK)
    # lash flicks off both corners
    d.shape(smooth([(48, 120), (20, 86), (8, 60), (40, 92), (70, 112)], closed=True), fill=INK)
    d.shape(smooth([(464, 120), (494, 96), (506, 74), (474, 98), (444, 112)], closed=True), fill=INK)
    d.shape(almond(cx, cy + 2, 372, 128), fill=SCLERA)
    d.shape(circle(cx + 12, cy + 2, 54), fill=CR, stroke=CR_D, sw=4)
    d.shape(circle(cx + 12, cy + 2, 22), fill=INK)
    d.shape(circle(cx - 6, cy - 16, 8), fill="#ffffff")
    d.shape(f"M{P(cx - 150, cy - 30)} Q{P(cx, cy - 104)} {P(cx + 150, cy - 30)}", stroke=INK, sw=8)
    return d


def flame_blade(d, L, W, bend, ang, ox, oy, mirror_x=None, eye_t=0.56, thorns=((0.42, 16), (0.7, 12))):
    outline, centre, tangent, width = blade(L, W, bend, thorns)
    pts = place(outline, ang, ox, oy, mirror_x)
    base, tip = place([centre(0)], ang, ox, oy, mirror_x)[0], place([centre(1)], ang, ox, oy, mirror_x)[0]
    d.shape(smooth(pts), grad=lin([(0, CR_DD, None), (0.45, CR_D, None), (0.85, CR, None), (1, CR_L, None)], base, tip), stroke="#ff5f66", sw=2)
    # darker spine
    spine = [centre(t / 10) for t in range(1, 10)]
    d.shape(smooth(place(spine, ang, ox, oy, mirror_x), closed=False), stroke=CR_DD, sw=3, opacity=70)
    if eye_t is not None:
        (ex, ey), (tx, ty) = centre(eye_t), tangent(eye_t)
        ea = math.degrees(math.atan2(ty, tx))
        w = width(eye_t)
        (gx, gy) = place([(ex, ey)], ang, ox, oy, mirror_x)[0]
        eye_ang = ea + ang if mirror_x is None else 180 - (ea + ang)
        d.shape(almond(gx, gy, w * 2.1, w * 0.95, eye_ang), fill=CR_DD, stroke=INK, sw=2)
        glow(d, gx, gy, w * 0.62)


def wings():
    d = Doc("ronova-wings", 1440, 820)
    cx, base_y = 720, 640
    spec = [  # length, width, bend, angle (deg, 0 = right, negative = up), base offset (dx, dy) along the shoulder
        (600, 84, 0.20, -86, 60, 0), (560, 86, 0.20, -64, 110, -40), (500, 82, 0.19, -42, 170, -60),
        (420, 74, 0.17, -20, 230, -60), (330, 62, 0.15, 4, 280, -44),
    ]
    for L, W, bend, ang, dx, dy in reversed(spec):
        flame_blade(d, L, W, bend, ang, cx + dx, base_y + dy)
        flame_blade(d, L, W, bend, ang, cx + dx, base_y + dy, mirror_x=cx)
    return d


def feather():
    d = Doc("ronova-feather", 320, 640)
    flame_blade(d, 560, 78, 0.16, -86, 140, 612)
    return d


def poi_frame():
    d = Doc("ronova-poi-frame", 256, 256)
    c = (128, 128)
    for k in range(12):                                   # thorns round the rim
        a = -90 + k * 30
        d.shape(kite(*c, a, 100, 108, 126 if k % 3 == 0 else 116, 5), fill=CR)
    d.shape(circle(*c, 104), fill="#0d0206", stroke=CR, sw=3)
    d.shape(circle(*c, 92), stroke=CR_L, sw=1, opacity=45)
    d.shape(poly([(128, 8), (140, 26), (128, 44), (116, 26)]), fill=CR_DD, stroke=INK, sw=2)   # gem at the crown
    d.shape(poly([(128, 16), (134, 26), (128, 36), (122, 26)]), fill=BONE)
    return d


def corner():
    d = Doc("ronova-corner", 256, 256)
    for side in (0, 1):                                    # along the top edge, then down the left edge
        pts = []
        for i in range(25):
            t = i / 24
            x, y = 12 + t * 230, 14 + math.sin(t * math.pi * 2.2) * 4
            pts.append((x, y))
        up = [(x, y - 5 * (1 - i / 24) - 1) for i, (x, y) in enumerate(pts)]
        dn = [(x, y + 5 * (1 - i / 24) + 1) for i, (x, y) in enumerate(pts)]
        for i in (5, 11, 17):                              # thorns
            x, y = pts[i]
            dn.insert(i + 1, (x + 10, y + 16 - i * 0.4))
        outline = up + list(reversed(dn))
        if side:
            outline = [(y, x) for x, y in outline]
        d.shape(smooth(outline), fill=CR, stroke=INK, sw=1.2)
    d.shape(poly([(14, -2 + 14), (28, 14), (14, 28), (0, 14)]), fill=CR_DD, stroke=INK, sw=2)
    d.shape(poly([(14, 8), (20, 14), (14, 20), (8, 14)]), fill=BONE)
    return d


# ---------------------------------------------------------------- UI components
# Frames are drawn for CSS border-image 9-slicing: ornaments sit inside the corner slices,
# the edges between them are plain lines that survive stretching.
def diamond(cx, cy, hw, hh):
    return poly([(cx, cy - hh), (cx + hw, cy), (cx, cy + hh), (cx - hw, cy)])


def mirror4(S, W=None, H=None):
    W, H = W or S, H or S
    return [lambda p: p, lambda p: (W - p[0], p[1]), lambda p: (p[0], H - p[1]), lambda p: (W - p[0], H - p[1])]


def ui_panel_frame():
    S = 256                                    # slice 72 on every side
    d = Doc("ui-panel-frame", S, S)
    d.shape(f"M10 10 H{S-10} V{S-10} H10Z", stroke=CR, sw=2)
    d.shape(f"M17 17 H{S-17} V{S-17} H17Z", stroke=BONE, sw=1, opacity=22)
    for f in mirror4(S):
        thorn_top = [f(p) for p in [(30, 10), (42, 10), (50, 1.5), (40, 7)]]
        thorn_side = [f(p) for p in [(10, 30), (10, 42), (1.5, 50), (7, 40)]]
        d.shape(poly(thorn_top), fill=CR)
        d.shape(poly(thorn_side), fill=CR)
        # a small head-blade curling inward from the corner
        blade_pts = [f(p) for p in [(20, 20), (40, 26), (58, 40), (62, 56), (50, 52), (34, 40)]]
        d.shape(smooth(blade_pts), grad=lin([(0, CR_D, None), (1, CR_L, None)], f((20, 20)), f((62, 56))), stroke=INK, sw=1.2)
        gx, gy = f((12, 12))
        d.shape(diamond(gx, gy, 11, 11), fill=CR_DD, stroke=CR, sw=2)
        d.shape(diamond(gx, gy, 5, 5), fill=BONE)
    return d


def ui_card_frame():
    S = 160                                    # slice 40
    d = Doc("ui-card-frame", S, S)
    d.shape(f"M6 6 H{S-6} V{S-6} H6Z", stroke=CR, sw=1.5, opacity=85)
    for f in mirror4(S):
        d.shape(poly([f(p) for p in [(18, 6), (26, 6), (30, 1)]]), fill=CR)
        d.shape(poly([f(p) for p in [(6, 18), (6, 26), (1, 30)]]), fill=CR)
        gx, gy = f((7, 7))
        d.shape(diamond(gx, gy, 5.5, 5.5), fill=CR_DD, stroke=CR, sw=1.5)
        d.shape(diamond(gx, gy, 2.5, 2.5), fill=BONE)
    return d


def _button(name, primary):
    W, H = 240, 72                             # slice 0 36 0 36
    d = Doc(name, W, H)
    body = f"M3 36 L30 4 H{W-30} L{W-3} 36 L{W-30} 68 H30Z"
    inner = f"M13 36 L34 11 H{W-34} L{W-13} 36 L{W-34} 61 H34Z"
    if primary:
        d.shape(body, grad=lin([(0, "#e23a4b", None), (0.55, CR, None), (1, "#7d0d1c", None)], (W / 2, 4), (W / 2, 68)), stroke="#ff8f8f", sw=1.5)
        d.shape(inner, stroke="#ffd0cc", sw=1, opacity=40)
    else:
        d.shape(body, fill="#0d0206", opacity=80)
        d.shape(body, stroke=CR, sw=1.5)
        d.shape(inner, stroke=BONE, sw=1, opacity=18)
    for x in (18, W - 18):
        d.shape(diamond(x, 36, 5, 8), fill=BONE if primary else CR)
    return d


def ui_btn_primary():
    return _button("ui-btn-primary", True)


def ui_btn_ghost():
    return _button("ui-btn-ghost", False)


def ui_divider():
    d = Doc("ui-divider", 120, 28)
    d.shape(poly([(30, 14), (44, 9), (44, 19)]), fill=CR)
    d.shape(poly([(90, 14), (76, 9), (76, 19)]), fill=CR)
    d.shape(almond(60, 14, 40, 18), fill=CR_DD, stroke=CR, sw=1.5)
    d.shape(diamond(60, 14, 4, 6), fill=BONE)
    return d


def ui_crest():
    d = Doc("ui-crest", 260, 96)
    cx, cy = 130, 56
    for mx in (None, cx):                       # little flame wings, the left one mirrored from the right
        flame_blade(d, 96, 16, 0.18, -22, cx + 34, cy + 6, mirror_x=mx, eye_t=None, thorns=((0.5, 6),))
        flame_blade(d, 70, 12, 0.16, -4, cx + 34, cy + 16, mirror_x=mx, eye_t=None, thorns=())
    d.shape(smooth([(cx - 20, cy - 22), (cx - 9, cy - 40), (cx, cy - 30), (cx + 9, cy - 46), (cx + 18, cy - 24), (cx, cy - 18)]), fill=INK)
    d.shape(almond(cx, cy, 104, 48), fill=INK)
    d.shape(almond(cx, cy, 86, 36), grad=rad([(0, "#fdf0ec", None), (1, "#c99a96", None)], (cx, cy - 4), 46))
    d.shape(circle(cx, cy, 15), grad=rad([(0, "#b0162c", None), (1, "#4d0410", None)], (cx, cy), 15))
    d.shape(star(cx, cy, 8, 11, 4), fill="#ff9c94")
    d.shape(circle(cx, cy, 6), grad=rad([(0, "#ffffff", 1), (1, CR_L, 0)], (cx, cy), 6))
    return d


def ui_gem():
    d = Doc("ui-gem", 24, 24)
    d.shape(diamond(12, 12, 9, 11), fill=CR_DD, stroke=CR, sw=1.5)
    d.shape(diamond(12, 12, 4, 5), fill=BONE)
    return d


def ui_close():
    d = Doc("ui-close", 40, 40)
    for a in (45, -45):
        d.shape(kite(20, 20, a, -16, 0, 16, 18) if False else poly(rot([(-17, 0), (0, -3.2), (17, 0), (0, 3.2)], a, 20, 20)),
                grad=lin([(0, CR_D, None), (1, CR_L, None)], (4, 20), (36, 20)), stroke=INK, sw=0.8)
    d.shape(diamond(20, 20, 4.5, 4.5), fill=BONE, stroke=CR, sw=1)
    return d


# ---------------------------------------------------------------- title screen
# A broken-stroke display face for the day name (every letter of the seven days), the small
# mark under it and a ring of watching eyes. Glyphs are centre-lines in a W x 120 box, drawn
# with an 11 px butt-capped stroke; each letter has one deliberate break.
TITLE_OUT = os.path.join(ROOT, "assets", "ronova", "title")
GH, GSW = 120, 11


def arc(cx, cy, rx, ry, a0, a1):
    """Cubic segments along an ellipse from angle a0 to a1 (degrees, y down); continues the current point."""
    n = max(1, math.ceil(abs(a1 - a0) / 90))
    out = ""
    for i in range(n):
        t0, t1 = math.radians(a0 + (a1 - a0) * i / n), math.radians(a0 + (a1 - a0) * (i + 1) / n)
        k = 4 / 3 * math.tan((t1 - t0) / 4)
        p0 = (cx + rx * math.cos(t0), cy + ry * math.sin(t0))
        p3 = (cx + rx * math.cos(t1), cy + ry * math.sin(t1))
        c1 = (p0[0] - k * rx * math.sin(t0), p0[1] + k * ry * math.cos(t0))
        c2 = (p3[0] + k * rx * math.sin(t1), p3[1] - k * ry * math.cos(t1))
        out += f" C{P(*c1)} {P(*c2)} {P(*p3)}"
    return out


GLYPHS = {  # letter: (width, [stroked sub-paths], [filled shapes])
    "A": (104, ["M8 114 L42.3 29.8", "M52 6 L96 114"], [diamond(52, 82, 7, 9)]),
    "D": (100, ["M8 22 V98", "M22 6 H46" + arc(46, 60, 48, 54, -90, 90) + " H22"], []),
    "Y": (104, ["M8 6 L40 44", "M96 6 L52 60 V114"], []),
    "M": (112, ["M8 114 V6 L50 66", "M62 66 L104 6 V114"], []),
    "O": (116, ["M" + P(58 + 54 * math.cos(math.radians(-50)), 60 + 54 * math.sin(math.radians(-50))) + arc(58, 60, 54, 54, -50, 285)], []),
    "N": (104, ["M8 114 V6 L96 114", "M96 92 V6"], []),
    "T": (104, ["M6 6 H98", "M52 22 V114"], []),
    "U": (104, ["M8 6 V66" + arc(52, 66, 44, 48, 180, 0) + " V24"], []),
    "E": (96, ["M8 6 V114", "M22 6 H90", "M22 60 H76", "M22 114 H90"], []),
    "S": (100, ["M92 6 H36" + arc(36, 33, 27, 27, -90, -270), "M50 60 H64" + arc(64, 87, 27, 27, -90, 90) + " H8"], []),
    "W": (136, ["M6 6 L36 114 L62 40", "M74 40 L100 114 L130 6"], []),
    "H": (104, ["M8 6 V114", "M96 6 V114", "M24 60 H96"], []),
    "R": (100, ["M8 114 V6 H60" + arc(60, 33, 27, 27, -90, 90) + " H22", "M56 74 L92 114"], []),
    "I": (16, ["M8 6 V48", "M8 64 V114"], []),
    "F": (96, ["M8 6 V114", "M22 6 H90", "M22 60 H74"], []),
}


def glyph_shapes(d, letter, ox=0.0, oy=0.0, color=BONE):
    w, strokes, fills = GLYPHS[letter]
    for s in strokes:
        d.shape(_shift(s, ox, oy), stroke=color, sw=GSW, cap="butt", join="miter", miter=1.5)
    for f in fills:
        d.shape(_shift(f, ox, oy), fill=color)
    return w


def _shift(d, ox, oy):
    """Move a path made of absolute M/L/H/V/C/Z commands."""
    if not ox and not oy:
        return d
    import re
    toks, out, cmd, i = re.findall(r"[MLHVCZ]|-?\d+(?:\.\d+)?", d), [], None, 0
    while i < len(toks):
        t = toks[i]
        if t.isalpha():
            cmd = t; out.append(t); i += 1; continue
        if cmd == "H":
            out.append(f"{float(t) + ox:.2f}"); i += 1
        elif cmd == "V":
            out.append(f"{float(t) + oy:.2f}"); i += 1
        else:
            out.append(f"{float(t) + ox:.2f} {float(toks[i + 1]) + oy:.2f}"); i += 2
    return " ".join(out)


def title_glyph(letter):
    w = GLYPHS[letter][0]
    d = Doc(f"glyph-{letter}", w, GH)
    d.out, d.exports = TITLE_OUT, (".svg",)
    glyph_shapes(d, letter)
    return d


def title_glyph_sheet():
    """Every glyph on one page, to edit in VectorCraft and to eyeball the face."""
    letters = "MONDAYTUESWHRIF"
    d = Doc("title-glyphs", 1180, 340)
    d.out, d.exports = TITLE_OUT, (".vectorcraft", ".png")
    x, y = 30, 40
    for ch in letters:
        w = GLYPHS[ch][0]
        if x + w > 1150:
            x, y = 30, y + 160
        glyph_shapes(d, ch, x, y)
        x += w + 34
    return d


def title_mark():
    """The little mark under the day name: two falling strokes meeting on a gem, an eye above."""
    d = Doc("title-mark", 160, 84)
    d.out = TITLE_OUT
    cx = 80
    for s in (1, -1):
        d.shape(f"M{P(cx - s * 70, 10)} C{P(cx - s * 40, 14)} {P(cx - s * 14, 36)} {P(cx - s * 3, 64)}", stroke=BONE, sw=3, cap="butt")
    d.shape(almond(cx, 22, 30, 13), fill=CR_DD, stroke=BONE, sw=1.5)
    d.shape(circle(cx, 22, 4), fill=CR_L)
    d.shape(diamond(cx, 70, 7, 11), fill=CR_DD, stroke=BONE, sw=1.5)
    d.shape(diamond(cx, 70, 2.5, 4.5), fill=BONE)
    return d


def title_halo():
    """A ring of watching eyes, rotated slowly behind Ronova."""
    S = 900
    d = Doc("title-halo", S, S)
    d.out = TITLE_OUT
    c = S / 2
    d.shape(circle(c, c, 430), stroke=BONE, sw=1.2, opacity=35)
    d.shape(circle(c, c, 414), stroke=CR_L, sw=1, opacity=50, cap="butt", dash=[2, 10])
    d.shape(circle(c, c, 330), stroke=CR, sw=2, opacity=70)
    d.shape(circle(c, c, 318), stroke=BONE, sw=0.8, opacity=25)
    n = 16
    for k in range(n):
        a = -90 + k * 360 / n
        ex, ey = c + 372 * math.cos(math.radians(a)), c + 372 * math.sin(math.radians(a))
        big = k % 4 == 0
        w, h = (64, 26) if big else (40, 16)
        d.shape(almond(ex, ey, w, h, a + 90), fill=SCLERA if big else CR_DD, stroke=CR if big else CR_L, sw=1.5, opacity=90 if big else 70)
        d.shape(circle(ex, ey, h * 0.34), fill=CR if big else CR_L)
        if big:
            d.shape(star(ex, ey, 7, h * 0.3, h * 0.12, a), fill="#ffd9d2")
        d.shape(kite(c, c, a + 180 / n, 326, 340, 362 if big else 352, 1.6), fill=CR, opacity=80)
    return d


TITLE = [title_glyph_sheet, title_mark, title_halo] + [(lambda ch: lambda: title_glyph(ch))(ch) for ch in GLYPHS]

ASSETS = [sigil, ornament, great_eye, watcher, wings, feather, poi_frame, corner]
UI = [ui_panel_frame, ui_card_frame, ui_btn_primary, ui_btn_ghost, ui_divider, ui_crest, ui_gem, ui_close]
UI_OUT = os.path.join(ROOT, "assets", "ronova", "ui")


def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(UI_OUT, exist_ok=True)
    only = set(sys.argv[1:])
    os.makedirs(TITLE_OUT, exist_ok=True)
    for fn in ASSETS + UI + TITLE:
        doc = fn()
        if only and doc.name not in only and not any(doc.name.startswith(o.rstrip("*")) for o in only if o.endswith("*")):
            continue
        out_dir = doc.out or (UI_OUT if fn in UI else OUT)
        steps = os.path.join(out_dir, f".{doc.name}.commands.json")
        json.dump(doc.cmds, open(steps, "w", encoding="utf8"))
        base = os.path.join(out_dir, doc.name)
        args = [a for ext in doc.exports for a in ("--export", base + ext)]
        r = subprocess.run([CLI, "run", "--commands", steps, *args, "--scale", "2"],
                           capture_output=True, text=True)
        os.remove(steps)
        bad = [ln for ln in r.stdout.splitlines() if '"error"' in ln]
        print(f"{doc.name}: {len(doc.cmds)} commands, exit {r.returncode}" + (f"\n  {bad[:3]}" if bad else "") + (f"\n  {r.stderr.strip()[:400]}" if r.returncode else ""))


if __name__ == "__main__":
    main()
