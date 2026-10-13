# Cozy Time — 3D beach background draft. Run: blender -b -P blender/beach3d.py -- out.png
import bpy, math, random, sys
from mathutils import Vector
random.seed(7)
out = sys.argv[sys.argv.index("--")+1] if "--" in sys.argv else "//beach3d.png"
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def hexc(h, a=1.0):
    h = h.lstrip('#'); c = [int(h[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(((x/12.92) if x<=0.04045 else ((x+0.055)/1.055)**2.4) for x in c)+(a,)

def mat(name, col, rough=0.8, emit=0, metal=0, alpha=1.0, trans=0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hexc(col)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = hexc(col); b.inputs["Emission Strength"].default_value = emit
    if trans: b.inputs["Transmission Weight"].default_value = trans
    return m

def obj(o, m, smooth=False):
    o.data.materials.append(m)
    if smooth: bpy.ops.object.shade_smooth()
    return o

# Sand: displaced plane
bpy.ops.mesh.primitive_plane_add(size=60, location=(0,6,0))
sand = bpy.context.object
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.subdivide(number_cuts=60); bpy.ops.object.mode_set(mode='OBJECT')
for v in sand.data.vertices:
    x,y = v.co.x, v.co.y
    v.co.z = 0.25*math.sin(x*0.35)+0.18*math.cos(y*0.5+x*0.2) - max(0,(y-2))*0.12
obj(sand, mat("sand","#e8c890",0.95), True)

# Sea: plane with gentle waves, glossy turquoise
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,108,-0.05))
sea = bpy.context.object; sea.name='Sea'
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.subdivide(number_cuts=80); bpy.ops.object.mode_set(mode='OBJECT')
for v in sea.data.vertices:
    v.co.z = 0.08*math.sin(v.co.x*0.8+v.co.y*0.3)+0.05*math.sin(v.co.y*1.3)
obj(sea, mat("sea","#1a9ab8",0.05), True)
# shallow lagoon band
bpy.ops.mesh.primitive_plane_add(size=1, location=(0,13,0.0)); sh = bpy.context.object; sh.name='Shallow'
sh.scale = (80,5,1); obj(sh, mat("shallow","#90e0e8",0.1, alpha=0.7))
# foam line
bpy.ops.mesh.primitive_torus_add(major_radius=60, minor_radius=0.12, location=(0,70.3,0.02))
foam = bpy.context.object; foam.name='Foam'; foam.scale=(1,1,0.3); obj(foam, mat("foam","#ffffff",0.6,emit=0.3))

# Palm tree
import bmesh

def mesh_obj(name, verts, faces, loc, m, smooth=True):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    o = bpy.data.objects.new(name, me); o.location = loc
    bpy.context.collection.objects.link(o); o.data.materials.append(m)
    if smooth:
        for poly in me.polygons: poly.use_smooth = True
    return o

TRUNK_M = None; LEAF_MS = []
def palm(x,y,h,lean,rot):
    global TRUNK_M
    if TRUNK_M is None:
        TRUNK_M = mat("trunk","#8a6a48",0.95)
        LEAF_MS.extend([mat("leaf_a","#3f8f45",0.6), mat("leaf_b","#4fa050",0.6), mat("leaf_c","#2f7a3c",0.65)])
    bend = Vector((math.cos(rot), math.sin(rot), 0))
    # trunk: one tapered tube along a curve, with growth rings
    R, SIDES = 34, 12
    pts = []; pos = Vector((x,y,-0.3)); d = Vector((math.sin(lean)*math.cos(rot), math.sin(lean)*math.sin(rot), 1)).normalized()
    for i in range(R+1):
        pts.append((pos.copy(), d.copy()))
        pos = pos + d*(h/R); d = (d + bend*0.018).normalized()
    verts, faces = [], []
    for i,(p,dd) in enumerate(pts):
        t = i/R
        r = 0.34*(1-t) + 0.17*t + 0.12*max(0,0.12-t)*8   # flared base
        r *= 1.0 if i%2 else 0.9                          # ring ridges
        q = dd.to_track_quat('Z','Y')
        for k in range(SIDES):
            a = k/SIDES*2*math.pi
            verts.append(tuple(p + q @ Vector((math.cos(a)*r, math.sin(a)*r, 0))))
    for i in range(R):
        for k in range(SIDES):
            a0=i*SIDES+k; a1=i*SIDES+(k+1)%SIDES
            faces.append((a0,a1,a1+SIDES,a0+SIDES))
    tr = mesh_obj("Trunk", verts, faces, (0,0,0), TRUNK_M)
    tr.data.polygons.foreach_set("use_smooth", [True]*len(tr.data.polygons))
    crown = pts[-1][0] + pts[-1][1]*0.1

    # fronds: drooping midrib with paired, tapering leaflets
    NF = 13
    for f in range(NF):
        az = f/NF*2*math.pi + random.uniform(-0.15,0.15)
        young = f % 4 == 0
        L = random.uniform(2.6,3.4) * (0.75 if young else 1.0)
        e0 = math.radians(random.uniform(55,70) if young else random.uniform(25,45))
        g = 0.55 if young else random.uniform(0.95,1.3)       # gravity droop
        hd = Vector((math.cos(az), math.sin(az), 0)); side = Vector((-math.sin(az), math.cos(az), 0))
        N = 18; verts=[]; faces=[]
        def rib(s): return hd*(L*s*math.cos(e0)) + Vector((0,0,1))*(L*(math.sin(e0)*s - g*s*s*0.9))
        # midrib strip
        for i in range(N+1):
            s = i/N; p = rib(s); w = 0.035*(1-s)+0.008
            verts += [tuple(p+side*w), tuple(p-side*w)]
        for i in range(N): faces.append((2*i,2*i+1,2*i+3,2*i+2))
        # leaflets
        for i in range(2, N):
            s = i/N; p = rib(s); nxt = rib(min(1,s+0.9/N))
            fwd = (nxt-p).normalized()
            w = L*0.36*(math.sin(math.pi*min(1,s*1.05))**0.6)
            for sgn in (1,-1):
                droop = Vector((0,0,-w*(0.45 + 0.25*s)))
                tip = p + side*sgn*w + fwd*w*0.55 + droop
                base0 = p - fwd*0.04; base1 = p + fwd*(L/N)*0.7
                mid = p + side*sgn*w*0.55 + fwd*w*0.25 + droop*0.4
                n0 = len(verts)
                verts += [tuple(base0), tuple(base1), tuple(mid + fwd*0.05), tuple(tip)]
                faces += [(n0, n0+2, n0+1) if sgn>0 else (n0, n0+1, n0+2), (n0+1, n0+2, n0+3) if sgn>0 else (n0+1, n0+3, n0+2)]
        lf = mesh_obj('Leaf_%d_%d'%(int(x),f), verts, faces, tuple(crown), LEAF_MS[f%3])
    for k in range(4):
        a = k*1.7
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.2, location=crown+Vector((0.24*math.cos(a),0.24*math.sin(a),-0.32-0.06*(k%2))))
        obj(bpy.context.object, mat("coco","#6a4a30"), True)
palm(-3.6,8,6.5,0.25,0.3); palm(4.2,14,5.2,0.2,2.6)

# Umbrella + towel
bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.05, depth=2.6, location=(1.6,5,1.2))
obj(bpy.context.object, mat("pole","#f8f0e8"))
for i in range(8):
    bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=1.6, depth=0.6, location=(1.6,5,2.6))
    c = bpy.context.object; c.scale=(1,0.42,1); c.rotation_euler=(0,0,i*math.pi/4)
    c.location.x += math.cos(i*math.pi/4)*0.0
    obj(c, mat("umb%d"%i, "#e86a6a" if i%2 else "#fff4e8",0.6))
bpy.ops.mesh.primitive_cube_add(size=1, location=(2.6,4.4,0.12)); t=bpy.context.object
t.scale=(0.9,1.7,0.02); t.rotation_euler=(0,0,0.25); obj(t, mat("towel","#f0a860"))


# Foreground: striped beach towel and shells on the near sand (fills the lower screen)
def sand_z(x, y):
    ly = y - 6
    return 0.25*math.sin(x*0.35) + 0.18*math.cos(ly*0.5 + x*0.2) - max(0, ly-2)*0.12

def towel(cx, cy, rot, w=1.1, l=2.0, colors=("#f6efe2", "#3fa7c4", "#f6efe2", "#f08a5d", "#f6efe2", "#3fa7c4", "#f6efe2")):
    n = len(colors); ca, sa = math.cos(rot), math.sin(rot)
    for i, col in enumerate(colors):
        # one stripe across the towel's width, slightly rumpled to sit on the sand
        y0 = -l/2 + i*l/n; verts = []; faces = []
        NX, NY = 6, 3
        for a in range(NY+1):
            for b in range(NX+1):
                lx = -w/2 + w*b/NX; ly = y0 + (l/n)*a/NY
                x = cx + lx*ca - ly*sa; y = cy + lx*sa + ly*ca
                verts.append((x, y, sand_z(x, y) + 0.06 + 0.008*math.sin(lx*7 + ly*5)))
        for a in range(NY):
            for b in range(NX):
                k = a*(NX+1) + b
                faces.append((k, k+1, k+NX+2, k+NX+1))
        mesh_obj("Towel_%d" % i, verts, faces, (0, 0, 0), mat("towel%d" % i, col, 0.95))

def scallop(cx, cy, r, rot, col):
    # fan of ridged ribs, cupped upward
    verts = [(0, 0, 0.02)]; faces = []; N = 14
    for i in range(N+1):
        a = math.pi*(0.08 + 0.84*i/N); rr = r*(1.0 if i % 2 else 0.93)
        verts.append((math.cos(a)*rr, math.sin(a)*rr, 0.05*r + (0.03*r if i % 2 else 0)))
    for i in range(N): faces.append((0, i+1, i+2))
    o = mesh_obj("Shell", verts, faces, (cx, cy, sand_z(cx, cy) + 0.01), mat("shell_" + col, col, 0.5))
    o.rotation_euler = (0, 0, rot)

def spiral(cx, cy, r, rot, col):
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=r, depth=r*2.6, location=(cx, cy, sand_z(cx, cy) + r*0.6))
    o = bpy.context.object; o.rotation_euler = (math.radians(80), 0, rot); obj(o, mat("spiral_" + col, col, 0.45), True)

towel(0.95, 0.55, math.radians(-24), w=0.75, l=1.25)
for x, y, r, rot, col in [(-0.7, 0.35, 0.2, 0.4, "#f7d9c4"), (-0.25, 0.75, 0.14, -0.8, "#fff3e6"),
                          (-1.05, 1.0, 0.16, 2.2, "#f2b8a0"), (0.2, 0.15, 0.12, 1.1, "#fff3e6"),
                          (1.5, 1.3, 0.14, -0.3, "#f7d9c4")]:
    scallop(x, y, r, rot, col)
spiral(-0.45, 0.1, 0.08, 1.2, "#e8c8a8"); spiral(-0.85, 0.7, 0.07, -0.6, "#d8b090")

# Rocks, shells, beach ball
for i in range(6):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=random.uniform(0.2,0.6),
        location=(random.choice((-1,1))*random.uniform(2.8,6), random.uniform(3,11), 0.05))
    obj(bpy.context.object, mat("rock","#b8a898",0.9))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.35, location=(-1.4,1.8,0.35)); obj(bpy.context.object, mat("ball","#5ab8e8",0.3), True)

# Distant island
bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=9, depth=4, location=(-18,85,0.6))
obj(bpy.context.object, mat("island","#5a9a8a",0.9))

# Clouds
cm = mat("cloud","#ffffff",1,emit=0.6)
for cx,cz,cy in [(-10,14,90),(8,18,110),(20,12,95)]:
    for j in range(5):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=random.uniform(2,3.5), location=(cx+j*2.2, cy, cz+random.uniform(-0.6,0.6)))
        o=bpy.context.object; o.name='Cloud'; o.scale=(1,0.6,0.55); obj(o, cm, True)

# Sky
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes=True
nt=w.node_tree; bg=nt.nodes["Background"]
sky = nt.nodes.new("ShaderNodeTexSky"); sky.sky_type = 'MULTIPLE_SCATTERING'
try: sky.sun_elevation=math.radians(35); sky.sun_rotation=math.radians(200)
except: pass
nt.links.new(sky.outputs[0], bg.inputs[0]); bg.inputs[1].default_value=0.12

# Sun light
bpy.ops.object.light_add(type='SUN', location=(0,0,10)); sun=bpy.context.object
sun.data.energy=3; sun.data.color=hexc("#fff0d8")[:3]; sun.rotation_euler=(math.radians(50),0,math.radians(-30))
sun.data.angle=math.radians(3)

# Camera: portrait, low angle
bpy.ops.object.camera_add(location=(0,-3,3.2)); cam=bpy.context.object
cam.rotation_euler=(math.radians(76),0,0); cam.data.lens=24; sc.camera=cam
sc.render.resolution_x=1080; sc.render.resolution_y=1920
sc.render.engine='CYCLES'; sc.cycles.samples=64; sc.cycles.use_denoising=True
sc.view_settings.view_transform='AgX' if 'AgX' in [i.identifier for i in sc.view_settings.bl_rna.properties['view_transform'].enum_items] else 'Filmic'
sc.render.filepath=out
if '--glb' in sys.argv:
    bpy.ops.export_scene.gltf(filepath=out, export_cameras=True, export_lights=True, export_apply=True)
    raise SystemExit
sc.view_settings.look='AgX - Punchy' if sc.view_settings.view_transform=='AgX' else 'None'; bpy.ops.render.render(write_still=True)
