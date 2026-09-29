import React from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight, BrainCircuit, Camera, CheckCircle2, ChevronRight,
  CircleDot, Cpu, Crosshair, Gauge, Github, Map, Menu, Plane,
  Radio, ScanSearch, ShieldCheck, Target, Users, X, Zap, Upload,
  AlertTriangle, MapPin
} from "lucide-react";
import { DetectionStudio } from "./components/DetectionStudio";
import "./styles.css";

const features = [
  { icon: ScanSearch, title: "YOLO Human Detection", text: "Real-time person detection from aerial imagery using an anchor-based YOLO deep learning model." },
  { icon: AlertTriangle, title: "Disaster Threat Analysis", text: "Computer vision analysis to detect floods, wildfires/smoke plumes, structural collapse and landslides." },
  { icon: MapPin, title: "Open Source Maps (OSM)", text: "Automatic GPS coordinate extraction from drone EXIF metadata and interactive OpenStreetMap positioning." },
  { icon: Camera, title: "RGB + Depth Perception", text: "RealSense D455 provides RGB and depth information for scene understanding and distance estimation." },
  { icon: Crosshair, title: "Distance Estimation", text: "Detected people are paired with spatial geometry to estimate standoff distance from the camera." },
  { icon: BrainCircuit, title: "Edge Autonomy", text: "Edge-computed perception and telemetry pipeline designed for immediate field deployment." }
];

const hardware = [
  ["S500", "Drone platform", "Airframe for the search-and-rescue prototype."],
  ["Pixhawk 6X", "Flight controller", "Handles flight-control and vehicle telemetry functions."],
  ["RealSense D455", "Depth camera", "RGB + depth sensing for perception and distance estimation."],
  ["Jetson", "Edge computer", "Target platform for onboard AI/perception processing."],
];

function Section({id, eyebrow, title, children}) {
  return <section id={id} className="section">
    <div className="container">
      {eyebrow && <div className="eyebrow"><span></span>{eyebrow}</div>}
      <h2>{title}</h2>
      {children}
    </div>
  </section>
}

function App() {
  const [open, setOpen] = React.useState(false);
  const close = () => setOpen(false);

  return <div>
    <nav className="nav">
      <div className="nav-inner">
        <a className="brand" href="#home" onClick={close}><span className="brand-mark">A</span><span>AEROSAR</span></a>
        <div className={"nav-links " + (open ? "open" : "")}>
          {["home","workflow","technology","dashboard","progress"].map(x =>
            <a key={x} href={"#"+x} onClick={close}>
              {x === "dashboard" ? "AI Detection & Map" : x[0].toUpperCase()+x.slice(1)}
            </a>
          )}
        </div>
        <button className="menu" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X/> : <Menu/>}</button>
      </div>
    </nav>

    <main>
      <section id="home" className="hero">
        <div className="hero-grid"></div>
        <div className="container hero-content">
          <div className="eyebrow"><span></span> SEARCH & RESCUE / AI / OPENSTREETMAP</div>
          <h1>AI Powered<br/><em>Autonomous Drone</em><br/>for Search & Rescue</h1>
          <p className="hero-copy">Upload drone surveillance data to detect humans in the visual field using YOLO, identify active disasters (flood, fire, structural collapse), and resolve target coordinates with OpenStreetMap.</p>
          <div className="hero-actions">
            <a className="btn primary" href="#dashboard"><Upload size={16}/> Upload & Run AI Detection</a>
            <a className="btn ghost" href="#workflow">Explore System <ArrowRight size={17}/></a>
          </div>
          <div className="hero-stats">
            <div><b>YOLO Vision</b><span>Human detection</span></div>
            <div><b>Disaster Scan</b><span>Flood, fire & rubble</span></div>
            <div><b>OpenStreetMap</b><span>Coordinate detection</span></div>
          </div>
        </div>
        <div className="drone-card">
          <div className="radar"><div className="radar-line"></div><div className="radar-dot"></div><span>LIVE PERCEPTION</span></div>
          <div className="drone-silhouette"><Plane size={120} strokeWidth={1}/></div>
          <div className="telemetry"><span>MISSION</span><b>SEARCH ACTIVE</b><span>CAMERA</span><b>RGB + DEPTH</b></div>
        </div>
      </section>

      <Section id="workflow" eyebrow="01 / SYSTEM FLOW" title="From flight to detection">
        <div className="workflow">
          {[
            ["01","UPLOAD","Operator uploads drone camera image or live stream."],
            ["02","YOLO AI","Deep learning model locates humans with bounding boxes."],
            ["03","DISASTER","Computer vision detects floods, fire/smoke, or collapse."],
            ["04","COORDINATES","OpenStreetMap detects exact GPS coordinates & sector."],
            ["05","TACTICAL","Rescue team receives immediate distress priorities."]
          ].map(([n,t,d],i)=><div className="flow-step" key={n}>
            <div className="step-no">{n}</div><div className="step-icon"><CircleDot size={20}/></div>
            <h3>{t}</h3><p>{d}</p>{i<4 && <ChevronRight className="flow-arrow"/>}
          </div>)}
        </div>
      </Section>

      <Section id="technology" eyebrow="02 / TECHNOLOGY" title="Built around perception, robotics and edge AI">
        <div className="feature-grid">
          {features.map(({icon:Icon,title,text})=><article className="feature" key={title}><div className="icon"><Icon size={21}/></div><h3>{title}</h3><p>{text}</p></article>)}
        </div>
        <div className="tech-split">
          <div className="panel dark">
            <div className="panel-label">AI RESCUE PIPELINE</div>
            <h3>Upload → YOLO Detect → Disaster Scan → OpenStreetMap</h3>
            <div className="pipeline">
              <span>IMAGE UPLOAD</span><b>→</b><span>YOLO</span><b>→</b><span>HUMAN LOCATED</span><b>→</b><span>DISASTER CLASSIFIER</span><b>→</b><span>OSM GPS</span>
            </div>
            <p>Runs efficient in-browser inference to detect survivors, assess environmental disaster hazards, and pinpoint coordinates on OpenStreetMap without remote servers.</p>
          </div>
          <div className="panel">
            <div className="panel-label">SOFTWARE STACK</div>
            <div className="stack">
              <span>YOLO (COCO-SSD)</span><span>TensorFlow.js</span><span>OpenStreetMap</span><span>Leaflet</span><span>EXIF GPS</span><span>React</span><span>Vite</span>
            </div>
            <p>Designed for field operations with minimal overhead, high efficiency, and zero external backend dependency.</p>
          </div>
        </div>
      </Section>

      <Section id="hardware" eyebrow="03 / HARDWARE" title="Prototype hardware">
        <div className="hardware-grid">
          {hardware.map(([name,role,text])=><article className="hardware" key={name}>
            <div className="hardware-top"><Cpu size={20}/><span>{role}</span></div>
            <h3>{name}</h3><p>{text}</p>
          </article>)}
        </div>
      </Section>

      {/* 04 / LIVE DETECTION STUDIO & OPENSTREETMAP */}
      <Section id="dashboard" eyebrow="04 / LIVE SAR AI SUITE" title="Upload data, detect humans & pinpoint disaster coordinates">
        <DetectionStudio />
      </Section>

      <Section id="progress" eyebrow="05 / PROJECT STATUS" title="What is implemented">
        <div className="status-grid">
          <div className="status-col">
            <h3><CheckCircle2 size={20}/> Implemented & Active</h3>
            {[
              "Image upload with instant client-side YOLO processing",
              "Human / person detection with confidence scores & bounding boxes",
              "Automated disaster detection (Floods, Wildfires, Structural Rubble)",
              "OpenStreetMap coordinate detection with interactive map pin",
              "Automatic GPS extraction from drone image EXIF metadata",
              "Reverse geocoding with OpenStreetMap Nominatim"
            ].map(x=><div className="status-item" key={x}><CheckCircle2 size={16}/>{x}</div>)}
          </div>
          <div className="status-col pending">
            <h3><Zap size={20}/> Edge Hardware Integration</h3>
            {[
              "PX4 flight controller telemetry bridge via MAVLink",
              "Hardware-accelerated TensorRT execution on Jetson Orin",
              "RealSense D455 depth map point-cloud synchronization",
              "Multi-drone autonomous swarm search coordination"
            ].map(x=><div className="status-item" key={x}><CircleDot size={16}/>{x}</div>)}
          </div>
        </div>
      </Section>


      <section className="cta">
        <div className="container">
          <div className="eyebrow"><span></span> AEROSAR</div>
          <h2>Technology that supports<br/><em>faster search.</em></h2>
          <p>AI perception, depth sensing and aerial robotics brought together for search-and-rescue assistance.</p>
          <a className="btn primary" href="#home">Back to top <ArrowRight size={17}/></a>
        </div>
      </section>
    </main>

    <footer><div className="container footer-inner"><div className="brand"><span className="brand-mark">A</span><span>AEROSAR</span></div><span>AI Powered Autonomous Drone for Search & Rescue</span><span>Academic Prototype • 2026</span></div></footer>
  </div>
}

createRoot(document.getElementById("root")).render(<App />);