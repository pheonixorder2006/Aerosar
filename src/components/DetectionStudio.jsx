import React, { useState, useEffect, useRef } from "react";
import {
  Upload, AlertTriangle, CheckCircle, Crosshair, Users, MapPin,
  Flame, Droplets, Building2, Eye, ShieldAlert, Sparkles, RefreshCw,
  Compass, Radio, Camera, FileText, ChevronRight
} from "lucide-react";
import { detectHumans, loadYoloModel } from "../utils/yoloDetector";
import { analyzeDisaster } from "../utils/disasterDetector";
import { extractGPSFromImage, reverseGeocodeOSM, formatDMS } from "../utils/coordinateExtractor";
import { OSMMap } from "./OSMMap";

// Pre-configured default SAR coordinates (configurable via VITE_DEFAULT_LAT, VITE_DEFAULT_LNG)
const DEFAULT_COORDS = {
  latitude: parseFloat(import.meta.env?.VITE_DEFAULT_LAT ?? 11.4916),
  longitude: parseFloat(import.meta.env?.VITE_DEFAULT_LNG ?? 76.2230),
  source: import.meta.env?.VITE_DEFAULT_SECTOR_NAME || "Default SAR Base Sector"
};

export function DetectionStudio() {
  const [imageSrc, setImageSrc] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelStatus, setModelStatus] = useState("Ready");

  // Detection states
  const [humans, setHumans] = useState([]);
  const [disaster, setDisaster] = useState(null);
  
  // Coordinates state
  const [coords, setCoords] = useState(DEFAULT_COORDS);
  const [locationName, setLocationName] = useState({ shortName: "Wayanad, Kerala, India", fullName: "Wayanad District, Kerala, India" });
  const [coordSource, setCoordSource] = useState("SAR Default Sector");

  // Canvas ref for drawing bounding boxes
  const canvasRef = useRef(null);
  const imageElementRef = useRef(null);
  const fileInputRef = useRef(null);

  // Pre-load YOLO model on component mount for instant inference
  useEffect(() => {
    loadYoloModel((status) => setModelStatus(status)).catch(() => {
      setModelStatus("Fallback engine ready");
    });
  }, []);

  // Update reverse geocode whenever coordinates change
  useEffect(() => {
    let active = true;
    reverseGeocodeOSM(coords.latitude, coords.longitude).then((res) => {
      if (active && res) {
        setLocationName(res);
      }
    });
    return () => {
      active = false;
    };
  }, [coords.latitude, coords.longitude]);

  // Handle file selection / drop
  const handleFileUpload = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;

    setFileName(file.name);
    setIsProcessing(true);

    // 1. Extract GPS coordinates from EXIF if available
    try {
      const extractedGps = await extractGPSFromImage(file);
      if (extractedGps) {
        setCoords({
          latitude: extractedGps.latitude,
          longitude: extractedGps.longitude,
          source: "Image EXIF (Drone/Camera GPS)"
        });
        setCoordSource("Detected from Image EXIF GPS");
      } else {
        setCoordSource("Interactive Map Pin (Click to adjust)");
      }
    } catch (e) {
      console.warn("GPS extraction error:", e);
    }

    // 2. Read image file as URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Run YOLO human detection & Disaster analysis once image is loaded
  const onImageLoaded = async () => {
    const img = imageElementRef.current;
    if (!img) return;

    setIsProcessing(true);

    try {
      // Run human detection & disaster analysis in parallel for maximum efficiency
      const [humanRes, disasterRes] = await Promise.all([
        detectHumans(img),
        analyzeDisaster(img)
      ]);

      setHumans(humanRes.humans);
      setDisaster(disasterRes);
      drawBoundingBoxes(img, humanRes.humans);
    } catch (err) {
      console.error("Analysis error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Render tactical YOLO bounding boxes on canvas
  const drawBoundingBoxes = (img, detectedHumans) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);

    if (!detectedHumans || detectedHumans.length === 0) return;

    detectedHumans.forEach((human, idx) => {
      const [x, y, w, h] = human.bbox;

      // Glow effect
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 10;

      // Primary bounding box
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = Math.max(2, Math.round(width / 400));
      ctx.strokeRect(x, y, w, h);

      // Corner reticle accents
      const cornerLen = Math.min(w, h) * 0.22;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(3, Math.round(width / 300));

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(x, y + cornerLen);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerLen, y);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(x + w - cornerLen, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + cornerLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(x, y + h - cornerLen);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x + cornerLen, y + h);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(x + w - cornerLen, y + h);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w, y + h - cornerLen);
      ctx.stroke();

      // Label background banner
      ctx.shadowBlur = 0;
      const labelText = `HUMAN #${idx + 1} (${human.score}%)`;
      ctx.font = `bold ${Math.max(12, Math.round(width / 50))}px monospace`;
      const textMetrics = ctx.measureText(labelText);
      const textWidth = textMetrics.width;
      const textHeight = Math.max(16, Math.round(width / 40));

      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(x, Math.max(0, y - textHeight - 8), textWidth + 14, textHeight + 8);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, Math.max(0, y - textHeight - 8), textWidth + 14, textHeight + 8);

      // Label text
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(labelText, x + 7, Math.max(textHeight, y - 7));
    });
  };

  // Re-draw when canvas resized or human state changes
  useEffect(() => {
    if (imageElementRef.current && imageSrc) {
      drawBoundingBoxes(imageElementRef.current, humans);
    }
  }, [humans]);

  // Coordinate change handler from OpenStreetMap
  const handleCoordinateChange = (lat, lng, source) => {
    setCoords({ latitude: lat, longitude: lng, source });
    setCoordSource(source === "Map Drag" ? "Manual Map Pin Drag" : "OpenStreetMap Direct Click");
  };

  // Get device current GPS if user wants
  const detectDeviceGPS = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            latitude: parseFloat(pos.coords.latitude.toFixed(6)),
            longitude: parseFloat(pos.coords.longitude.toFixed(6)),
            source: "Device Live GPS"
          });
          setCoordSource("Device Geolocation GPS");
        },
        (err) => {
          alert("Could not access device GPS: " + err.message);
        }
      );
    }
  };

  // Preset SAR search sectors
  const setPresetLocation = (name, lat, lng) => {
    setCoords({ latitude: lat, longitude: lng, source: name });
    setCoordSource(`Preset: ${name}`);
  };

  const getDisasterIcon = (type) => {
    if (!type) return <ShieldAlert size={18} />;
    if (type.includes("Fire")) return <Flame size={18} className="text-red" />;
    if (type.includes("Flood")) return <Droplets size={18} className="text-blue" />;
    if (type.includes("Collapse") || type.includes("Rubble")) return <Building2 size={18} className="text-amber" />;
    return <CheckCircle size={18} className="text-green" />;
  };

  return (
    <div className="detection-studio">
      {/* Top Banner / Upload Zone */}
      <div className="studio-topbar">
        <div className="upload-section">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden-file-input"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          />

          <button
            className="btn primary upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            <Upload size={17} />
            <span>Upload Image for YOLO & Disaster Scan</span>
          </button>

          <span className="file-status">
            {fileName ? (
              <b>Loaded: {fileName}</b>
            ) : (
              <span>Upload aerial photos, drone captures, or disaster scene images (JPG, PNG)</span>
            )}
          </span>
        </div>

        <div className="model-pill">
          <span className="pill-dot"></span>
          <span>YOLO AI Engine: <b>{modelStatus}</b></span>
        </div>
      </div>

      {/* Main Grid: Left Viewer & Right Intelligence Panel */}
      <div className="studio-grid">
        {/* Left Column: Image Viewer + YOLO Overlays */}
        <div className="viewer-panel">
          <div className="viewer-header">
            <div className="viewer-title">
              <Eye size={15} />
              <span>AEROSAR COMPUTER VISION / PERCEPTION FEED</span>
            </div>
            {isProcessing && (
              <div className="processing-tag">
                <RefreshCw size={13} className="spin" /> Scanning with YOLO...
              </div>
            )}
          </div>

          <div
            className={`image-stage ${!imageSrc ? "empty-stage" : ""}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
            }}
          >
            {imageSrc ? (
              <div className="canvas-wrapper">
                <img
                  ref={imageElementRef}
                  src={imageSrc}
                  alt="SAR Target"
                  className="source-image"
                  onLoad={onImageLoaded}
                />
                <canvas ref={canvasRef} className="overlay-canvas" />

                {/* HUD Crosshairs */}
                <div className="hud-corner hud-tl" />
                <div className="hud-corner hud-tr" />
                <div className="hud-corner hud-bl" />
                <div className="hud-corner hud-br" />
              </div>
            ) : (
              <div className="empty-state" onClick={() => fileInputRef.current?.click()}>
                <div className="empty-icon-wrap">
                  <Upload size={36} />
                </div>
                <h3>Drop Image Here or Click to Upload</h3>
                <p>Upload any image to detect humans with YOLO, analyze disaster conditions, and detect GPS coordinates on OpenStreetMap.</p>
                <span className="btn ghost mini-btn">Select Image File</span>
              </div>
            )}
          </div>

          {/* Bottom Telemetry Ticker */}
          <div className="viewer-footer">
            <div>
              <span>HUMAN DETECTIONS</span>
              <b className={humans.length > 0 ? "highlight-cyan" : ""}>
                {humans.length} {humans.length === 1 ? "PERSON" : "PERSONS"}
              </b>
            </div>
            <div>
              <span>DISASTER STATUS</span>
              <b style={{ color: disaster ? disaster.hazardColor : "#94a3b8" }}>
                {disaster ? disaster.type.toUpperCase() : "AWAITING INPUT"}
              </b>
            </div>
            <div>
              <span>COORDINATES SOURCE</span>
              <b>{coordSource}</b>
            </div>
          </div>
        </div>

        {/* Right Column: Mission Intelligence & OpenStreetMap */}
        <div className="telemetry-panel">
          {/* 1. Human Detection Card */}
          <div className="card-box">
            <div className="card-box-header">
              <div className="header-title">
                <Users size={16} />
                <h4>YOLO Human Detection</h4>
              </div>
              <span className={`badge ${humans.length > 0 ? "badge-rescue" : "badge-neutral"}`}>
                {humans.length > 0 ? `${humans.length} FOUND` : "0 DETECTED"}
              </span>
            </div>

            <div className="human-summary">
              {humans.length > 0 ? (
                <div className="human-list">
                  {humans.map((h, i) => (
                    <div key={i} className="human-item">
                      <div className="human-item-left">
                        <Crosshair size={14} className="text-cyan" />
                        <span>Target {h.id}</span>
                      </div>
                      <div className="human-item-right">
                        <span className="conf-pill">{h.score}% Conf</span>
                        <span className="dist-pill">Est. {h.distanceEst}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-note">
                  {imageSrc
                    ? "No persons identified in the current visual frame with confidence threshold > 25%."
                    : "Upload an image above to run YOLO person identification."}
                </p>
              )}
            </div>
          </div>

          {/* 2. Disaster Detection Card */}
          <div className="card-box">
            <div className="card-box-header">
              <div className="header-title">
                {getDisasterIcon(disaster?.type)}
                <h4>Disaster Environmental Scan</h4>
              </div>
              {disaster && (
                <span
                  className="badge"
                  style={{
                    backgroundColor: `${disaster.hazardColor}20`,
                    color: disaster.hazardColor,
                    borderColor: disaster.hazardColor
                  }}
                >
                  {disaster.severity}
                </span>
              )}
            </div>

            {disaster ? (
              <div className="disaster-details">
                <div className="disaster-type-banner" style={{ borderLeftColor: disaster.hazardColor }}>
                  <div className="type-title" style={{ color: disaster.hazardColor }}>
                    {disaster.type}
                  </div>
                  <div className="type-summary">{disaster.summary}</div>
                </div>

                {/* Metrics Progress bars */}
                <div className="disaster-meters">
                  <div className="meter-item">
                    <div className="meter-labels">
                      <span>Water Inundation</span>
                      <b>{disaster.metrics.waterCoverage}%</b>
                    </div>
                    <div className="meter-track">
                      <div
                        className="meter-fill fill-blue"
                        style={{ width: `${disaster.metrics.waterCoverage}%` }}
                      />
                    </div>
                  </div>

                  <div className="meter-item">
                    <div className="meter-labels">
                      <span>Thermal / Fire Index</span>
                      <b>{disaster.metrics.thermalIndex}%</b>
                    </div>
                    <div className="meter-track">
                      <div
                        className="meter-fill fill-red"
                        style={{ width: `${Math.min(100, disaster.metrics.thermalIndex * 5)}%` }}
                      />
                    </div>
                  </div>

                  <div className="meter-item">
                    <div className="meter-labels">
                      <span>Structural Debris Entropy</span>
                      <b>{disaster.metrics.debrisEntropy}%</b>
                    </div>
                    <div className="meter-track">
                      <div
                        className="meter-fill fill-amber"
                        style={{ width: `${Math.min(100, disaster.metrics.debrisEntropy * 2)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="rescue-recommendation">
                  <b>RECOMMENDED ACTION:</b> {disaster.recommendation}
                </div>
              </div>
            ) : (
              <p className="empty-note">
                Upload image to analyze environmental disaster markers (flood waters, fire/smoke, structural rubble).
              </p>
            )}
          </div>

          {/* 3. Open Source Maps & Coordinates Detection Card */}
          <div className="card-box map-card">
            <div className="card-box-header">
              <div className="header-title">
                <MapPin size={16} />
                <h4>OpenStreetMap Coordinate Detection</h4>
              </div>
              <button className="gps-btn" onClick={detectDeviceGPS} title="Get Live Device GPS">
                <Radio size={12} /> Use Device GPS
              </button>
            </div>

            {/* Readout Numbers */}
            <div className="coords-display-banner">
              <div className="coord-col">
                <span className="coord-label">LATITUDE</span>
                <span className="coord-val">{coords.latitude.toFixed(6)}°</span>
                <span className="coord-sub">{formatDMS(coords.latitude, true)}</span>
              </div>
              <div className="coord-divider" />
              <div className="coord-col">
                <span className="coord-label">LONGITUDE</span>
                <span className="coord-val">{coords.longitude.toFixed(6)}°</span>
                <span className="coord-sub">{formatDMS(coords.longitude, false)}</span>
              </div>
            </div>

            {/* Location Area Geocoded from OpenStreetMap Nominatim */}
            <div className="osm-location-pill">
              <Compass size={13} className="text-cyan" />
              <span><b>OSM Location:</b> {locationName.shortName}</span>
            </div>

            {/* Interactive Leaflet OpenStreetMap */}
            <OSMMap
              coordinates={coords}
              onCoordinateChange={handleCoordinateChange}
              disasterType={disaster?.type}
              humanCount={humans.length}
            />

            {/* Quick SAR Preset Buttons */}
            <div className="sar-presets">
              <span className="preset-label">Test Sectors:</span>
              <button
                className="preset-tag"
                onClick={() => setPresetLocation("Wayanad Disaster Sector", 11.4916, 76.2230)}
              >
                Wayanad
              </button>
              <button
                className="preset-tag"
                onClick={() => setPresetLocation("Kerala Flood Basin", 9.9816, 76.2999)}
              >
                Flood Basin
              </button>
              <button
                className="preset-tag"
                onClick={() => setPresetLocation("Chamoli Ridge", 30.4077, 79.3248)}
              >
                Mountain Ridge
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
