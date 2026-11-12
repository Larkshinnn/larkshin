"""Build the 3D world in Blender: a tiered cluster of floating islands in Ronova's domain.

    "C:/Program Files/Blender Foundation/Blender 5.3/blender.exe" -b --factory-startup -P tools/build_world.py

Requiem Square floats in the middle; every section of the site has its own smaller island,
hung at a different height and chained to the square by a plank bridge. Each island is a
stack of snowy terraces on a jagged rock underside with crimson crystals; Ronova's watching
eyes drift between them and her great eye hangs in the sky behind. Writes

    assets/3d/world.glb       the scene (opens in Blender or any glTF viewer)
    assets/3d/world.glb.js    the same bytes as base64, so the site also works from file://
    assets/3d/world.blend     the editable Blender file

Positions below are given in three.js axes (X right, Y up, Z toward the camera); W() turns
them into Blender's (X, -Z, Y). world3d.js reads islands back by name: island_<id>, lm_<id>.
"""
import base64, math, os, random

import bpy, bmesh
from mathutils import Matrix, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "3d")
os.makedirs(OUT, exist_ok=True)


def W(x, y, z):                      # three.js position -> Blender
    return Vector((x, -z, y))


# ------------------------------------------------------------------ scene + materials
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene


def hexc(h, a=1.0):
    h = h.lstrip("#")
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return (*lin, a)


MATS = {}
def mat(name, color, rough=0.85, metal=0.0, emit=None, strength=0.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = hexc(color)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    if emit:
        p.inputs["Emission Color"].default_value = hexc(emit)
        p.inputs["Emission Strength"].default_value = strength
    m.diffuse_color = hexc(color)
    MATS[name] = m
    return m


M = {
    "snow_lo": mat("SnowLow", "#525665", 0.95),
    "snow": mat("Snow", "#737889", 0.92),
    "snow_hi": mat("SnowHigh", "#9da2b3", 0.9),
    "rock": mat("Rock", "#1c1720", 0.95),
    "rock2": mat("RockWarm", "#2a1d22", 0.95),
    "stone": mat("Stone", "#3a3341", 0.85),
    "stone_l": mat("StoneLight", "#5e5667", 0.8),
    "bone": mat("Bone", "#cfc3b8", 0.7),
    "roof": mat("Roof", "#4a0d17", 0.6),
    "iron": mat("Iron", "#2f2a30", 0.45, 0.8),
    "gold": mat("Gold", "#a77d3d", 0.35, 0.9),
    "wood": mat("Wood", "#1b1311", 0.9),
    "pine": mat("Pine", "#1c2a29", 0.9),
    "pine_snow": mat("PineSnow", "#a4aabb", 0.9),
    "glow": mat("Glow", "#ff2a3a", 0.5, 0, "#ff2a3a", 3.5),
    "glow_soft": mat("GlowSoft", "#c41c2c", 0.5, 0, "#ff3344", 2.2),
    "glow_gold": mat("GlowGold", "#ffc070", 0.5, 0, "#ffb050", 3.0),
    "crystal": mat("Crystal", "#5a0814", 0.2, 0, "#ff1f3d", 1.6),
    "sclera": mat("Sclera", "#e8d6cf", 0.6, 0, "#ffd9d0", 0.25),
    "pupil": mat("Pupil", "#120306", 0.6),
    "lid": mat("Lid", "#14030a", 0.55),
    "iris_ring": mat("IrisRing", "#3a0710", 0.4, 0, "#ff2a3a", 0.6),
    "wing": mat("Wing", "#6e0b19", 0.55, 0, "#ff2a3a", 0.35),
    "wing_vein": mat("WingVein", "#2a040b", 0.6),
}


# ------------------------------------------------------------------ mesh builder
class Part:
    """Accumulates primitives into one mesh with several materials."""

    def __init__(self, name):
        self.name, self.bm, self.mats = name, bmesh.new(), []

    def _mi(self, m):
        if m not in self.mats:
            self.mats.append(m)
        return self.mats.index(m)

    def add(self, build, m, mtx=Matrix()):
        tmp = bmesh.new()
        build(tmp)
        bmesh.ops.transform(tmp, matrix=mtx, verts=list(tmp.verts))
        idx = self._mi(m)
        for f in tmp.faces:
            f.material_index = idx
        me = bpy.data.meshes.new("tmp")
        tmp.to_mesh(me)
        tmp.free()
        self.bm.from_mesh(me)
        bpy.data.meshes.remove(me)
        return self

    def obj(self, loc=(0, 0, 0), parent=None):
        me = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(m)
        for poly in me.polygons:
            poly.use_smooth = False
        o = bpy.data.objects.new(self.name, me)
        o.location = loc
        scene.collection.objects.link(o)
        if parent:
            o.parent = parent
        return o


def TRS(t=(0, 0, 0), r=(0, 0, 0), s=(1, 1, 1)):
    R = Matrix.Rotation(r[2], 4, "Z") @ Matrix.Rotation(r[1], 4, "Y") @ Matrix.Rotation(r[0], 4, "X")
    return Matrix.Translation(t) @ R @ Matrix.Diagonal((*s, 1))


def cyl(p, m, r1, r2, h, segs=8, at=(0, 0, 0), rot=(0, 0, 0), s=(1, 1, 1)):
    """Cylinder / cone with its base at `at` (before rotation about that base)."""
    def b(bm):
        bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r1, radius2=max(r2, 0.0001), depth=h)
        bmesh.ops.translate(bm, vec=(0, 0, h / 2), verts=list(bm.verts))
    return p.add(b, m, TRS(at, rot, s))


def box(p, m, sx, sy, sz, at=(0, 0, 0), rot=(0, 0, 0)):
    """Box sx*sy*sz with its base centred at `at`."""
    def b(bm):
        bmesh.ops.create_cube(bm, size=1)
        bmesh.ops.translate(bm, vec=(0, 0, 0.5), verts=list(bm.verts))
    return p.add(b, m, TRS(at, rot, (sx, sy, sz)))


def ico(p, m, r, at=(0, 0, 0), s=(1, 1, 1), rot=(0, 0, 0), sub=1, jitter=0.0, rng=None):
    def b(bm):
        bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
        if jitter:
            for v in bm.verts:
                v.co *= 1 + (rng.random() - 0.5) * jitter
    return p.add(b, m, TRS(at, rot, s))


def torus(p, m, R, r, segs=24, rsegs=6, at=(0, 0, 0), rot=(0, 0, 0)):
    def b(bm):
        grid = []
        for i in range(segs):
            a = 2 * math.pi * i / segs
            ring = []
            for j in range(rsegs):
                c = 2 * math.pi * j / rsegs
                rr = R + r * math.cos(c)
                ring.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), r * math.sin(c))))
            grid.append(ring)
        for i in range(segs):
            for j in range(rsegs):
                a, b2 = grid[i], grid[(i + 1) % segs]
                bm.faces.new((a[j], b2[j], b2[(j + 1) % rsegs], a[(j + 1) % rsegs]))
    return p.add(b, m, TRS(at, rot))


def prism(p, m, pts, h, at=(0, 0, 0), rot=(0, 0, 0)):
    """Extrude a 2D outline (x, y) by h along +Z."""
    def b(bm):
        area = sum(pts[i - 1][0] * pts[i][1] - pts[i][0] * pts[i - 1][1] for i in range(len(pts)))
        q = pts if area > 0 else pts[::-1]
        bot = [bm.verts.new((x, y, 0)) for x, y in q]
        top = [bm.verts.new((x, y, h)) for x, y in q]
        bm.faces.new(top)
        bm.faces.new(bot[::-1])
        n = len(q)
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((bot[i], bot[j], top[j], top[i]))
    return p.add(b, m, TRS(at, rot))


def star_pts(n, ro, ri, a0=-90):
    return [((ro if i % 2 == 0 else ri) * math.cos(math.radians(a0 + i * 180 / n)),
             (ro if i % 2 == 0 else ri) * math.sin(math.radians(a0 + i * 180 / n))) for i in range(2 * n)]


# ------------------------------------------------------------------ Ronova's eyes
# Eyes are built flat in the X/Z plane, facing -Y (the viewer), out of extruded outlines:
# an almond of sclera, a dark upper lid with lashes and hooked tails, a thin crimson lower
# lid, a glowing iris with her seven-pointed star pupil, and optionally flame-blade wings.
def plate(p, m, pts, y0, depth, mtx=Matrix()):
    """Extrude an outline given in eye-plane (u, v) coords: back face at y0, front at y0 - depth."""
    def b(bm):
        back = [bm.verts.new((u, y0, v)) for u, v in pts]
        front = [bm.verts.new((u, y0 - depth, v)) for u, v in pts]
        bm.faces.new(front)
        bm.faces.new(back[::-1])
        n = len(pts)
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((back[i], back[j], front[j], front[i]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return p.add(b, m, mtx)


def lens(w, h, n=28, full=0.8, t0=-1.0, t1=1.0):
    """The almond's top curve, left to right: v = h/2 (1 - t^2)^full."""
    return [((t0 + (t1 - t0) * i / n) * w / 2, h / 2 * max(0.0, 1 - (t0 + (t1 - t0) * i / n) ** 2) ** full) for i in range(n + 1)]


def almond_pts(w, h, n=28):
    top = lens(w, h, n)
    return top + [(u, -v) for u, v in reversed(top[1:-1])]


def circle_pts(cx, cy, r, n=24):
    return [(cx + r * math.cos(2 * math.pi * i / n), cy + r * math.sin(2 * math.pi * i / n)) for i in range(n)]


def rot2(pts, ang, ox=0.0, oy=0.0, mirror=False):
    c, s = math.cos(ang), math.sin(ang)
    out = [(ox + x * c - y * s, oy + x * s + y * c) for x, y in pts]
    return [(-x, y) for x, y in out] if mirror else out


def blade2d(L, W, bend, thorns=(), samples=20):
    """Ronova's flame-feather blade (same curve as tools/ronova_assets.py), base at (0,0), tip at (L,0)."""
    def centre(t):
        return (t * L, math.sin(t * math.pi * 1.15) * bend * L * (1 - 0.35 * t))

    def tangent(t):
        a, b = centre(max(t - 1e-3, 0)), centre(min(t + 1e-3, 1))
        n = math.hypot(b[0] - a[0], b[1] - a[1]) or 1
        return ((b[0] - a[0]) / n, (b[1] - a[1]) / n)

    def width(t):
        return W * (math.sin(math.pi * min(1, t ** 0.62)) ** 0.9) * (1 - 0.15 * t) + W * 0.04

    upper, lower = [], []
    for i in range(samples + 1):
        t = i / samples
        (x, y), (tx, ty) = centre(t), tangent(t)
        nx, ny = -ty, tx
        w = width(t)
        upper.append((x + nx * w, y + ny * w))
        lower.append((x - nx * w * 0.8, y - ny * w * 0.8))
        for tt, size in thorns:
            if abs(t - tt) < 0.5 / samples:
                lower.append((x - nx * (w * 0.8 + size) + tx * size * 0.9, y - ny * (w * 0.8 + size) + ty * size * 0.9))
    return upper + list(reversed(lower[1:])), centre, tangent, width


def wing_fan(p, w, h, n, Lmax, y0, mtx=Matrix()):
    """Fans of flame blades either side of the eye, each blade with its own glowing slit eye."""
    th = h * 0.1
    for k in range(n):
        f = k / max(1, n - 1)
        ang = math.radians(80 - f * 86)                       # from almost straight up to just below level
        L = Lmax * (1 - 0.32 * abs(f - 0.3))
        Wd = L * 0.14
        outline, centre, tangent, width = blade2d(L, Wd, 0.15, thorns=((0.42, Wd * 0.55), (0.7, Wd * 0.4)))
        # blade2d follows the SVG asset, where y points down; flip it so the blades sweep up here
        outline = [(x, -y) for x, y in outline]
        base = (w * 0.36, -h * 0.06 + (0.5 - f) * h * 0.25)
        yk = y0 + (n - k) * th * 0.6                           # upper blades sit behind lower ones
        spine = [(x, -y) for x, y in (centre(t / 12) for t in range(1, 12))]
        sw = [(x, y + Wd * 0.09) for x, y in spine] + [(x, y - Wd * 0.09) for x, y in reversed(spine)]
        (ex, ey), (tx, ty) = centre(0.56), tangent(0.56)
        ey, ty = -ey, -ty
        ew = width(0.56)
        slit = rot2(almond_pts(ew * 1.9, ew * 0.85, 16), math.atan2(ty, tx), ex, ey)
        for mirror in (False, True):
            def put(pts):
                return rot2(pts, ang, base[0], base[1], mirror)
            plate(p, M["wing"], put(outline), yk, th, mtx)
            plate(p, M["wing_vein"], put(sw), yk - th, th * 0.3, mtx)
            plate(p, M["pupil"], put(slit), yk - th, th * 0.5, mtx)
            cx, cy = put([(ex, ey)])[0]
            plate(p, M["glow"], circle_pts(cx, cy, ew * 0.32, 10), yk - th * 1.4, th * 0.4, mtx)


def ronova_eye(p, w, h, iris=None, wings=0, wing_len=0.0, mtx=Matrix()):
    """A full eye at the origin of the eye plane. The iris goes into `iris` (its own object, so it
    can look around) when given, otherwise into `p`."""
    d = h * 0.14                                               # sclera thickness
    if wings:
        wing_fan(p, w, h, wings, wing_len, d * 1.6, mtx)
    plate(p, M["sclera"], almond_pts(w, h), 0, d, mtx)
    # upper lid: a crescent over the top curve, thick and dark, with hooked tails and lashes
    inner = lens(w, h)
    lid_t = h * 0.24
    outer = lens(w * 1.08, h + lid_t * 2, full=0.72)
    plate(p, M["lid"], outer + list(reversed(inner)), d * 0.3, d * 1.6, mtx)
    for s in (1, -1):
        tail = [(w * 0.48, h * 0.02), (w * 0.62, h * 0.16), (w * 0.74, h * 0.1), (w * 0.6, h * 0.0), (w * 0.52, -h * 0.06)]
        plate(p, M["lid"], [(u * s, v) for u, v in tail][::s], d * 0.3, d * 1.4, mtx)
    for k in range(7):                                          # lashes
        t = -0.66 + k * 0.22
        u, v = t * w * 1.08 / 2, (h / 2 + lid_t) * (1 - t * t) ** 0.72
        nx, ny = t * 0.9, 1.0
        nn = math.hypot(nx, ny)
        nx, ny = nx / nn, ny / nn
        L, bw = h * (0.26 - 0.08 * abs(t)), w * 0.022
        tip = (u + nx * L + t * h * 0.08, v + ny * L)
        plate(p, M["lid"], [(u - ny * bw, v + nx * bw - h * 0.02), tip, (u + ny * bw, v - nx * bw - h * 0.02)], d * 0.3, d * 1.0, mtx)
    # lower lid: a thin crimson crescent
    bot = [(u, -v) for u, v in lens(w * 0.96, h)]
    low = [(u, -v) for u, v in lens(w * 1.02, h + h * 0.14)]
    plate(p, M["roof"], bot + list(reversed(low)), d * 0.3, d * 1.2, mtx)
    # iris, ring and the seven-pointed star pupil
    q = iris if iris is not None else p
    r = h * 0.37
    plate(q, M["iris_ring"], [(r * math.cos(a * math.pi / 16), r * math.sin(a * math.pi / 16)) for a in range(32)], -d * 0.9, d * 0.2, mtx)
    plate(q, M["glow"], [(r * 0.82 * math.cos(a * math.pi / 16), r * 0.82 * math.sin(a * math.pi / 16)) for a in range(32)], -d * 1.05, d * 0.2, mtx)
    plate(q, M["glow_gold"], star_pts(7, r * 0.62, r * 0.24), -d * 1.2, d * 0.15, mtx)
    plate(q, M["pupil"], [(r * 0.16 * math.cos(a * math.pi / 6), r * 0.16 * math.sin(a * math.pi / 6)) for a in range(12)], -d * 1.32, d * 0.12, mtx)
    plate(q, M["sclera"], [(-r * 0.42 + r * 0.12 * math.cos(a * math.pi / 4), r * 0.4 + r * 0.12 * math.sin(a * math.pi / 4)) for a in range(8)], -d * 1.4, d * 0.1, mtx)


def eye(p, at, w, h, depth, face=(0, -1, 0), iris_m=None):
    """A small Ronova eye set into a landmark, facing `face` (default: toward the camera)."""
    yaw = math.atan2(face[0], -face[1])
    ronova_eye(p, w, h, mtx=TRS(at, (0, 0, yaw)))



# ------------------------------------------------------------------ landmarks (local, base at z = 0)
def lm_spawn(p):
    cyl(p, M["stone"], 17, 17, 1.0, 28)
    cyl(p, M["stone_l"], 12.5, 12.5, 1.6, 28)
    cyl(p, M["stone"], 2.6, 1.7, 19, 4, at=(0, 0, 1.6), rot=(0, 0, math.pi / 4))
    cyl(p, M["gold"], 1.8, 0, 3.2, 4, at=(0, 0, 20.6), rot=(0, 0, math.pi / 4))
    torus(p, M["gold"], 4.2, 0.22, 32, 5, at=(0, 0, 14), rot=(0.35, 0, 0))
    eye(p, (0, -1.9, 15.2), 3.2, 1.6, 1.0)
    eye(p, (0, 1.9, 15.2), 3.2, 1.6, 1.0, face=(0, 1, 0))
    for k in range(6):
        a = k * math.pi / 3 + math.pi / 6
        x, y = 10 * math.cos(a), 10 * math.sin(a)
        cyl(p, M["stone_l"], 0.9, 0.7, 3.2, 6, at=(x, y, 1.6))
        cyl(p, M["iron"], 1.2, 0.9, 0.6, 8, at=(x, y, 4.8))
        ico(p, M["glow"], 0.75, at=(x, y, 5.9), s=(1, 1, 1.6))


def lm_profile(p, rng):
    for (x, y, h, r) in [(0, 0, 15, 5), (-4, 3, 10, 4), (4, 2.5, 8, 3.5), (1, -4, 6, 3.6)]:
        ico(p, M["rock"], 1, at=(x, y, h / 2), s=(r, r, h / 2), sub=1, jitter=0.35, rng=rng)
    cyl(p, M["iron"], 0.35, 0.35, 8, 6, at=(0, 0, 13))
    box(p, M["iron"], 6, 0.5, 0.5, at=(2.8, 0, 20.6))
    cx, cz = 5.6, 13.0
    box(p, M["iron"], 0.12, 0.12, 2.2, at=(cx, 0, 18.4))
    for k in range(10):
        a = 2 * math.pi * k / 10
        box(p, M["iron"], 0.22, 0.22, 4.6, at=(cx + 2 * math.cos(a), 2 * math.sin(a), cz))
    torus(p, M["iron"], 2, 0.18, 20, 4, at=(cx, 0, cz))
    torus(p, M["iron"], 2, 0.18, 20, 4, at=(cx, 0, cz + 4.6))
    cyl(p, M["iron"], 2.2, 0.2, 1.4, 10, at=(cx, 0, cz + 4.6))
    ico(p, M["glow"], 1.1, at=(cx, 0, cz + 2.3), sub=1)


def lm_runs(p):
    cyl(p, M["stone"], 7.5, 7, 3, 8)
    cyl(p, M["stone"], 4.6, 3.1, 24, 8, at=(0, 0, 3))
    for z, r in [(7, 4.35), (14, 3.9), (21, 3.4)]:
        cyl(p, M["gold"], r + 0.25, r + 0.2, 0.5, 8, at=(0, 0, z))
    for z in (9.5, 16.5):
        for k in range(4):
            a = k * math.pi / 2 + math.pi / 8
            r = 4.2 - (z - 3) * 0.06
            box(p, M["glow_soft"], 0.9, 0.3, 2.2, at=(r * math.cos(a), r * math.sin(a), z), rot=(0, 0, a + math.pi / 2))
    cyl(p, M["stone_l"], 3.6, 3.6, 1.2, 8, at=(0, 0, 27))
    for k in range(8):
        a = 2 * math.pi * k / 8
        cyl(p, M["gold"], 0.6, 0, 4.5, 4, at=(3.1 * math.cos(a), 3.1 * math.sin(a), 28.2), rot=(0.25 * math.sin(a), -0.25 * math.cos(a), 0))
    ico(p, M["glow"], 1.7, at=(0, 0, 30.2), sub=1)
    cyl(p, M["stone_l"], 1.1, 0, 12, 6, at=(0, 0, 31.5))


def lm_team(p):
    box(p, M["stone"], 28, 18, 1.2)
    box(p, M["stone_l"], 25, 15, 1.2, at=(0, 0, 1.2))
    for row in (-5.6, 5.6):
        for k in range(6):
            cyl(p, M["stone_l"], 0.9, 0.8, 9, 8, at=(-10 + k * 4, row, 2.4))
    box(p, M["stone"], 13, 8, 9, at=(0, 0, 2.4))
    box(p, M["glow_soft"], 2.6, 0.3, 5, at=(0, -4.05, 2.4))
    box(p, M["stone"], 24.5, 14, 1.6, at=(0, 0, 11.4))
    prism(p, M["roof"], [(-7.6, 0), (7.6, 0), (0, 6)], 25.4, at=(-12.7, 0, 13), rot=(0, math.pi / 2, 0))
    cyl(p, M["gold"], 1.4, 1.4, 0.4, 12, at=(0, -7.6, 15), rot=(math.pi / 2, 0, 0))
    for x in (-8, 8):
        box(p, M["roof"], 1.8, 0.2, 7, at=(x, -7.2, 4))
        box(p, M["gold"], 2.2, 0.3, 0.3, at=(x, -7.2, 11))


def lm_ledger(p):
    box(p, M["stone"], 18, 12, 12)
    prism(p, M["roof"], [(-6.4, 0), (6.4, 0), (0, 9)], 18.6, at=(-9.3, 0, 12), rot=(0, math.pi / 2, 0))
    for x in (-10.5, 10.5):
        cyl(p, M["stone"], 3.2, 2.9, 19, 8, at=(x, -4, 0))
        cyl(p, M["roof"], 3.8, 0, 9, 8, at=(x, -4, 19))
        cyl(p, M["gold"], 0.25, 0.05, 3, 4, at=(x, -4, 28))
        for z in (6, 12):
            box(p, M["glow_soft"], 0.8, 0.3, 2, at=(x, -7.05, z))
    cyl(p, M["stone_l"], 3.6, 3.6, 0.8, 16, at=(0, -6.1, 13), rot=(math.pi / 2, 0, 0))
    eye(p, (0, -6.6, 13), 5.8, 2.8, 1.0)
    for x in (-5, 5):
        for z in (3, 7.5):
            box(p, M["glow_soft"], 1.2, 0.3, 2.6, at=(x, -6.05, z))
    box(p, M["iron"], 3, 0.4, 4.6, at=(0, -6.1, 0))


def lm_amv(p, reel):
    cyl(p, M["stone"], 5.4, 5, 15, 12)
    cyl(p, M["stone_l"], 5.8, 5.8, 1, 12, at=(0, 0, 15))
    for k in range(8):
        a = 2 * math.pi * k / 8
        box(p, M["stone_l"], 1.4, 1.2, 1.6, at=(5.2 * math.cos(a), 5.2 * math.sin(a), 16), rot=(0, 0, a))
    for k in range(4):
        a = k * math.pi / 2
        box(p, M["glow_soft"], 0.8, 0.3, 2.4, at=(5.05 * math.cos(a), 5.05 * math.sin(a), 8), rot=(0, 0, a + math.pi / 2))
    box(p, M["iron"], 0.8, 0.8, 9, at=(0, 0, 16))
    # the reel turns: its own object, centred on its axle
    cyl(reel, M["iron"], 7.5, 7.5, 1.2, 28, at=(0, 0.6, 0), rot=(math.pi / 2, 0, 0))
    torus(reel, M["gold"], 7.4, 0.3, 32, 5, rot=(math.pi / 2, 0, 0))
    for k in range(6):
        a = 2 * math.pi * k / 6
        cyl(reel, M["glow"], 1.6, 1.6, 1.4, 12, at=(4.4 * math.cos(a), 0.7, 4.4 * math.sin(a)), rot=(math.pi / 2, 0, 0))
    cyl(reel, M["gold"], 1.4, 1.4, 1.8, 10, at=(0, 0.9, 0), rot=(math.pi / 2, 0, 0))


def lm_dev(p, rng):
    cyl(p, M["stone"], 13, 13, 0.8, 20)
    for k, (x, y, h, a) in enumerate([(-7, 2, 14, 0.15), (-2, -3, 19, -0.05), (4, 1, 16, 0.1), (8.5, -2.5, 11, -0.2), (1, 6, 9, 0.3)]):
        box(p, M["stone"], 3.4, 1.4, h, at=(x, y, 0.8), rot=(rng.uniform(-0.04, 0.04), rng.uniform(-0.04, 0.04), a))
        lines = rng.randint(4, 6)
        for i in range(lines):
            w = rng.uniform(0.8, 2.6)
            ox = -1.3 + w / 2 + rng.choice([0, 0, 0.5])
            z = 0.8 + h * 0.35 + i * 1.1
            c, s_ = math.cos(a), math.sin(a)
            px, py = ox * c + 0.75 * s_, ox * s_ - 0.75 * c
            box(p, M["glow_gold"], w, 0.12, 0.35, at=(x + px, y + py, z), rot=(0, 0, a))


def lm_teyvat(p, star):
    for x in (-6.5, 6.5):
        box(p, M["stone"], 2.8, 2.8, 17, at=(x, 0, 0))
        box(p, M["gold"], 3.2, 3.2, 0.6, at=(x, 0, 17))
    box(p, M["stone"], 17, 3.4, 2.6, at=(0, 0, 17.6))
    cyl(p, M["gold"], 1.2, 0, 2.4, 4, at=(0, 0, 20.2), rot=(0, 0, math.pi / 4))
    box(p, M["stone_l"], 18, 6, 0.8)
    prism(star, M["glow_gold"], star_pts(8, 4.2, 1.8), 0.7, at=(0, 0.35, 0), rot=(math.pi / 2, 0, 0))
    prism(star, M["glow_gold"], star_pts(4, 6.5, 0.9, -45), 0.4, at=(0, 0.2, 0), rot=(math.pi / 2, 0, 0))


def lm_contact(p):
    for (x, y, r) in [(0, 0, 7), (3, -3, 4), (-4, 2, 4.5)]:
        ico(p, M["rock"], 1, at=(x, y, 1.2), s=(r, r, 2.4), sub=1)
    cyl(p, M["bone"], 4.2, 2.9, 21, 10, at=(0, 0, 2.5))
    for z in (6, 12, 18):
        r = 4.2 - (z - 2.5) / 21 * 1.3
        cyl(p, M["roof"], r + 0.08, r - 0.12, 2, 10, at=(0, 0, z))
    cyl(p, M["iron"], 3.8, 3.8, 0.6, 12, at=(0, 0, 23.5))
    cyl(p, M["glow_gold"], 2.3, 2.3, 3.2, 10, at=(0, 0, 24.1))
    for k in range(6):
        a = 2 * math.pi * k / 6
        box(p, M["iron"], 0.25, 0.25, 3.2, at=(2.4 * math.cos(a), 2.4 * math.sin(a), 24.1))
    cyl(p, M["roof"], 3.2, 0, 3.6, 10, at=(0, 0, 27.3))
    cyl(p, M["gold"], 0.2, 0, 1.8, 4, at=(0, 0, 30.9))



# ------------------------------------------------------------------ the islands
# id: (three.js centre of the top surface, radius, landmark, landmark scale)
ISLANDS = {
    "spawn":   ((0, 0, 0), 64, "spawn", 1.6),
    "profile": ((-185, 34, 10), 32, "profile", 1.3),
    "runs":    ((-150, -38, 118), 32, "runs", 1.3),
    "team":    ((-98, 66, -128), 40, "team", 1.15),
    "ledger":  ((-30, -52, 168), 38, "ledger", 1.2),
    "amv":     ((70, 88, -160), 33, "amv", 1.25),
    "dev":     ((168, 22, -62), 36, "dev", 1.2),
    "teyvat":  ((198, 64, 70), 34, "teyvat", 1.2),
    "contact": ((118, -44, 150), 31, "contact", 1.25),
}


def blob(rng, R, n=44, amp=0.16):
    ph = [rng.random() * 6.28 for _ in range(3)]
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        r = R * (1 + amp * (0.6 * math.sin(3 * a + ph[0]) + 0.3 * math.sin(5 * a + ph[1]) + 0.15 * math.sin(9 * a + ph[2])))
        r *= 1 + (rng.random() - 0.5) * 0.05
        pts.append((r * math.cos(a), r * math.sin(a)))
    return pts


def inside(pt, ring):
    x, y, c = pt[0], pt[1], False
    for i in range(len(ring)):
        (x0, y0), (x1, y1) = ring[i], ring[i - 1]
        if (y0 > y) != (y1 > y) and x < (x1 - x0) * (y - y0) / (y1 - y0) + x0:
            c = not c
    return c


def terrace(bm_part, rng, ring, z0, z1, top_m, wall_m):
    """One snowy terrace: flat top at z1, rocky wall down to z0 (Blender local coords)."""
    def b(bm):
        n = len(ring)
        lip = z1 - min(1.4, (z1 - z0) * 0.3)
        bot, mid, top = [], [], []
        for x, y in ring:
            jx, jy = (rng.random() - 0.5) * 1.2, (rng.random() - 0.5) * 1.2
            bot.append(bm.verts.new((x * 0.97 + jx, y * 0.97 + jy, z0)))
            mid.append(bm.verts.new((x + jx * 0.6, y + jy * 0.6, lip)))
            top.append(bm.verts.new((x, y, z1)))
        f = bm.faces.new(top)
        f.material_index = 1
        for i in range(n):
            j = (i + 1) % n
            for a, c in ((bot, mid), (mid, top)):
                bm.faces.new((a[i], a[j], c[j], c[i])).material_index = 0
    tmp = bmesh.new()
    b(tmp)
    wi, ti = bm_part._mi(wall_m), bm_part._mi(top_m)
    for f in tmp.faces:
        f.material_index = ti if f.material_index == 1 else wi
    me = bpy.data.meshes.new("tmp")
    tmp.to_mesh(me)
    tmp.free()
    bm_part.bm.from_mesh(me)
    bpy.data.meshes.remove(me)


def underside(p, rng, ring, depth, levels=6):
    """The hanging rock: shrinking, wobbling rings down to a point, plus stalactites and crystals."""
    def b(bm):
        n = len(ring)
        prev = [bm.verts.new((x, y, -4)) for x, y in ring]
        first = prev
        for j in range(1, levels):
            t = j / levels
            f = (1 - t) ** 0.85
            z = -4 - depth * t ** 1.15
            cx, cy = (rng.random() - 0.5) * depth * 0.08, (rng.random() - 0.5) * depth * 0.08
            cur = []
            for x, y in ring:
                k = f * (1 + (rng.random() - 0.5) * 0.22)
                cur.append(bm.verts.new((x * k + cx, y * k + cy, z + (rng.random() - 0.5) * depth * 0.05)))
            for i in range(n):
                i2 = (i + 1) % n
                bm.faces.new((cur[i], cur[i2], prev[i2], prev[i]))
            prev = cur
        tip = bm.verts.new(((rng.random() - 0.5) * 3, (rng.random() - 0.5) * 3, -4 - depth * 1.08))
        for i in range(n):
            bm.faces.new((tip, prev[(i + 1) % n], prev[i]))
        # lid under the top terrace, hidden but keeps the mesh closed for shadows
        return first
    p.add(b, M["rock"])
    R = max(math.hypot(x, y) for x, y in ring)
    for _ in range(rng.randint(4, 7)):                      # stalactites
        a, d = rng.random() * 6.28, rng.uniform(0.25, 0.7) * R
        z = -4 - depth * (d / R) ** 0.9 * 0.35 - 2
        cyl(p, M["rock2"], rng.uniform(2, 4.5), 0, rng.uniform(8, 22), 5, at=(d * math.cos(a), d * math.sin(a), z), rot=(math.pi, 0, rng.random() * 6.28))
    for _ in range(rng.randint(3, 6)):                      # crimson crystals breaking out of the rock
        a, d = rng.random() * 6.28, rng.uniform(0.35, 0.8) * R
        z = -4 - depth * (1 - d / R) * 0.5 - 3
        out = (math.cos(a), math.sin(a))
        for k in range(rng.randint(2, 4)):
            tilt = (-out[1] * rng.uniform(1.6, 2.4), out[0] * rng.uniform(1.6, 2.4), rng.random() * 6.28)
            cyl(p, M["crystal"], rng.uniform(0.8, 1.6), 0, rng.uniform(4, 11), 4, at=(d * out[0] + rng.uniform(-1.5, 1.5), d * out[1] + rng.uniform(-1.5, 1.5), z), rot=tilt)


def pine(p, rng, x, y, z, s):
    cyl(p, M["wood"], 0.35 * s, 0.28 * s, 1.8 * s, 5, at=(x, y, z))
    for i, (r, h) in enumerate([(2.4, 3.1), (1.8, 2.7), (1.2, 2.3)]):
        zz = z + (1.3 + i * 1.8) * s
        rot = (0, 0, rng.random() * 6.28)
        cyl(p, M["pine"], r * s, 0, h * s, 6, at=(x, y, zz), rot=rot)
        cyl(p, M["pine_snow"], r * s * 0.55, 0, h * s * 0.42, 6, at=(x, y, zz + h * s * 0.58), rot=rot)


def crystal_cluster(p, rng, x, y, z, s=1.0):
    for _ in range(rng.randint(3, 5)):
        a, d = rng.random() * 6.28, rng.uniform(0, 1.4) * s
        tilt = (rng.uniform(-0.4, 0.4), rng.uniform(-0.4, 0.4), rng.random() * 6.28)
        cyl(p, M["crystal"], 0.8 * s, 0, rng.uniform(4, 9) * s, 4, at=(x + d * math.cos(a), y + d * math.sin(a), z - 0.4), rot=tilt)


def grave(p, rng, x, y, z):
    lean = (rng.uniform(-0.12, 0.12), 0, rng.uniform(-0.3, 0.3))
    if rng.random() < 0.4:
        box(p, M["stone_l"], 0.5, 0.5, 3.4, at=(x, y, z), rot=lean)
        box(p, M["stone_l"], 2.0, 0.5, 0.5, at=(x, y, z + 2.3), rot=lean)
    else:
        box(p, M["stone"], 1.9, 0.6, 2.1, at=(x, y, z), rot=lean)


LANDMARK = {
    "spawn": lambda p, rng, ex: lm_spawn(p),
    "profile": lambda p, rng, ex: lm_profile(p, rng),
    "runs": lambda p, rng, ex: lm_runs(p),
    "team": lambda p, rng, ex: lm_team(p),
    "ledger": lambda p, rng, ex: lm_ledger(p),
    "amv": lambda p, rng, ex: lm_amv(p, ex),
    "dev": lambda p, rng, ex: lm_dev(p, rng),
    "teyvat": lambda p, rng, ex: lm_teyvat(p, ex),
    "contact": lambda p, rng, ex: lm_contact(p),
}
LM_FOOT = {"spawn": 17, "profile": 9, "runs": 8, "team": 15, "ledger": 13, "amv": 8, "dev": 13, "teyvat": 10, "contact": 8}


def build_island(iid, seed):
    (cx, cy, cz), R, lm, lms = ISLANDS[iid]
    rng = random.Random(seed)
    p = Part(f"island_{iid}")
    base = blob(rng, R)
    hub = iid == "spawn"
    # terraces: the main shelf, then smaller raised shelves stepping up behind the landmark
    terrace(p, rng, base, -5, 0, M["snow"], M["rock"])
    shelves = [(0.68, 7, (0, 0)), (0.46, 14, (0, 0))] if hub else [(0.42, 7, (0.38, 0.42)), (0.22, 14, (0.5, 0.55))]
    tops = []
    for k, (s, h, (ox, oy)) in enumerate(shelves):
        ring = [(x * s + ox * R, y * s + oy * R) for x, y in blob(rng, R)]
        terrace(p, rng, ring, h - 9.5, h, M["snow_hi"] if k else M["snow"], M["rock"])
        tops.append((ring, h))
    underside(p, rng, base, R * (1.45 if hub else 1.25))
    # landmark: centre of the hub's top shelf; at the front of the other islands
    lm_at = (0, 0, shelves[-1][1]) if hub else (0, -R * 0.16, 0)
    foot = LM_FOOT[lm] * lms + 3
    # scatter: pines on the shelf rims, crystals on the high shelves, graves on the hub
    def free(x, y, z_ok):
        if math.hypot(x - lm_at[0], y - lm_at[1]) < foot:
            return False
        return True
    for _ in range(int(R * 1.6)):
        a, d = rng.random() * 6.28, rng.uniform(0.35, 0.92) * R
        x, y = d * math.cos(a), d * math.sin(a)
        if not inside((x, y), base) or not free(x, y, 0):
            continue
        z = 0
        for ring, h in tops:
            if inside((x * 1.08, y * 1.08), ring):
                z = None
                break
        if z is None:
            continue
        if hub and rng.random() < 0.5 and d < R * 0.8:
            grave(p, rng, x, y, 0)
        else:
            pine(p, rng, x, y, 0, rng.uniform(1.0, 1.8))
    for ring, h in tops[-1:]:
        for _ in range(3 if not hub else 2):
            x, y = ring[rng.randrange(len(ring))]
            mx = sum(q[0] for q in ring) / len(ring); my = sum(q[1] for q in ring) / len(ring)
            x, y = mx + (x - mx) * 0.5, my + (y - my) * 0.5
            if hub:
                continue
            crystal_cluster(p, rng, x, y, h, 1.2)
    island = p.obj(W(cx, cy, cz))
    lmp = Part(f"lm_{iid}")
    extra = None
    if lm == "amv":
        extra = Part("lm_amv_reel")
    elif lm == "teyvat":
        extra = Part("lm_teyvat_star")
    LANDMARK[lm](lmp, rng, extra)
    lmo = lmp.obj(lm_at, parent=island)
    lmo.scale = (lms, lms, lms)
    if extra is not None:
        extra.obj((0, -0.2, 25.5) if lm == "amv" else (0, 0, 9.5), parent=lmo)
    return island


def rim_point(iid, toward):
    """A point on an island's rim facing `toward` (three.js coords), on its top surface."""
    (cx, cy, cz), R, *_ = ISLANDS[iid]
    dx, dz = toward[0] - cx, toward[2] - cz
    d = math.hypot(dx, dz) or 1
    return Vector((cx + dx / d * R * 0.86, cy, cz + dz / d * R * 0.86))


def build_bridges():
    """Plank bridges on two chains from the square to every island, sagging between them."""
    p = Part("bridges")
    hub = ISLANDS["spawn"][0]
    for iid, ((x, y, z), *_r) in ISLANDS.items():
        if iid == "spawn":
            continue
        a, b = rim_point("spawn", (x, y, z)), rim_point(iid, hub)
        span = (b - a).length
        sag = 6 + span * 0.07
        n = int(span / 3.4)
        pts = []
        for k in range(n + 1):
            t = k / n
            q = a.lerp(b, t)
            q.y -= sag * 4 * t * (1 - t)
            pts.append(q)
        side = Vector((-(b.z - a.z), 0, b.x - a.x)).normalized()
        for k in range(n):
            q0, q1 = pts[k], pts[k + 1]
            mid = (q0 + q1) / 2
            d = q1 - q0
            # Blender box: local Y runs along the bridge (heading phi), tilted up by pitch
            phi = math.atan2(-d.x, -d.z)
            pitch = math.atan2(d.y, math.hypot(d.x, d.z))
            rot = (pitch, 0, phi)
            box(p, M["wood"], 5.6, 2.6, 0.35, at=W(mid.x, mid.y, mid.z), rot=rot)
            for s in (-1, 1):                           # the two chains, a little above the planks
                cm = mid + side * 3.0 * s + Vector((0, 1.6, 0))
                box(p, M["iron"], 0.25, d.length * 1.02, 0.25, at=W(cm.x, cm.y, cm.z), rot=rot)
        for end in (a, b):                              # lantern posts at both ends
            for s in (-1, 1):
                e = end + side * 3.6 * s
                cyl(p, M["iron"], 0.35, 0.3, 4.5, 6, at=W(e.x, e.y, e.z))
                ico(p, M["glow"], 0.7, at=W(e.x, e.y + 5, e.z), s=(1, 1, 1.4))
    return p.obj()


def build_sky():
    rng = random.Random(21)
    objs = []
    # watching eyes drifting between the islands
    spots = [(-90, 70, 60), (60, 40, 90), (-150, 95, -40), (120, 110, -10), (20, 130, -90), (-60, 20, 130), (200, 20, -150), (-220, 80, 120)]
    for i, (x, y, z) in enumerate(spots):
        p, iris = Part(f"watcher_{i}"), Part(f"watcher_{i}_iris")
        ronova_eye(p, 9, 3.8, iris=iris, wings=3, wing_len=8.5)
        o = p.obj(W(x, y, z))
        iris.obj((0, 0, 0), parent=o)
        o.scale = (1.15, 1.15, 1.15)
        objs.append(o)
    # the great eye of her domain, in the sky behind the islands, turned to the viewer by world3d.js
    g, gi = Part("great_eye"), Part("great_eye_iris")
    ronova_eye(g, 96, 36, iris=gi, wings=5, wing_len=105)
    go = g.obj(W(0, 30, -1000))
    gi.obj((0, 0, 0), parent=go)
    go.scale = (2.6, 2.6, 2.6)
    objs.append(go)
    # broken rock drifting further out
    d = Part("debris")
    for _ in range(46):
        a = rng.random() * 6.28
        r = rng.uniform(270, 520)
        x, z, y = r * math.cos(a), r * math.sin(a) * 0.8 - 60, rng.uniform(-120, 140)
        s = rng.uniform(3, 14)
        ico(d, M["rock"], 1, at=W(x, y, z), s=(s, s, s * rng.uniform(0.6, 1.4)), sub=1, jitter=0.5, rng=rng)
        if rng.random() < 0.35:
            cyl(d, M["crystal"], s * 0.25, 0, s * 0.9, 4, at=W(x, y - s * 0.5, z), rot=(math.pi, 0, 0))
    objs.append(d.obj())
    # the player's wisp
    w = Part("player")
    cyl(w, M["crystal"], 1.3, 0, 2.6, 4)
    cyl(w, M["crystal"], 1.3, 0, 1.6, 4, rot=(math.pi, 0, 0))
    torus(w, M["gold"], 2.2, 0.12, 28, 4, rot=(0.35, 0, 0), at=(0, 0, 0.4))
    wo = w.obj((0, 0, 0))
    wo.scale = (1.8, 1.8, 1.8)
    objs.append(wo)
    return objs


# ------------------------------------------------------------------ go
for i, iid in enumerate(ISLANDS):
    build_island(iid, 100 + i * 17)
build_bridges()
build_sky()

faces = sum(len(o.data.polygons) for o in scene.objects if o.type == "MESH")
glb = os.path.join(OUT, "world.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", export_apply=True, export_yup=True,
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
                          export_texcoords=False)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "world.blend"))
data = open(glb, "rb").read()
with open(os.path.join(OUT, "world.glb.js"), "w", encoding="ascii") as f:
    f.write("/* assets/3d/world.glb as base64, so the 3D world loads from file:// too. Generated by tools/build_world.py */\n")
    f.write("window.WORLD_GLB=\"" + base64.b64encode(data).decode("ascii") + "\";\n")
print(f"WORLD: {len(scene.objects)} objects, {faces} faces, glb {len(data) / 1024:.0f} KB")
