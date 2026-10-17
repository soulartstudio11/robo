
const video = document.getElementById("camera");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const stage = document.getElementById("stage");
const placeholder = document.getElementById("placeholder");

const minSlider = document.getElementById("minMoisture");
const maxSlider = document.getElementById("maxMoisture");

let stream = null;
let sampleMode = false;
let tool = "robot";
let robot = null;
let plants = [];
let pathPoints = [];
let drawing = false;
let timer = null;
let running = false;
let currentPlant = 0;
let moisture = 45;
let pumpOn = false;
let wateringTicks = 0;

function resizeCanvas() {
  const rect = stage.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  canvas.style.width = rect.width + "px";
  canvas.style.height = rect.height + "px";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function pointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
  };
}

function toPixels(point) {
  return {
    x: point.x * stage.clientWidth,
    y: point.y * stage.clientHeight
  };
}

function draw() {
  const width = stage.clientWidth;
  const height = stage.clientHeight;

  ctx.clearRect(0, 0, width, height);

  if (sampleMode) {
    ctx.strokeStyle = "#8cae8d";
    ctx.globalAlpha = 0.35;

    for (let x = 20; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 20; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    plants.forEach(point => {
      const p = toPixels(point);
      ctx.fillStyle = "#589858";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 13, 8, -0.4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  if (pathPoints.length) {
    ctx.beginPath();

    pathPoints.forEach((point, index) => {
      const p = toPixels(point);

      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });

    ctx.strokeStyle = "#f5a623";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  plants.forEach((point, index) => {
    const p = toPixels(point);

    ctx.fillStyle = "#20a45a";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "white";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(index + 1), p.x, p.y);
  });

  if (robot) {
    const p = toPixels(robot);

    ctx.fillStyle = "#e44848";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "white";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("R", p.x, p.y);
  }
}

function setTool(nextTool) {
  tool = nextTool;

  document.querySelectorAll("[data-tool]").forEach(button => {
    button.classList.toggle("active", button.dataset.tool === tool);
  });

  const tips = {
    robot: "Click the robot's starting position.",
    plant: "Click each plant location.",
    path: "Click and drag to draw your route.",
    erase: "Click near a robot or plant marker to erase it."
  };

  document.getElementById("stageTip").textContent = tips[tool];
}

document.querySelectorAll("[data-tool]").forEach(button => {
  button.addEventListener("click", () => setTool(button.dataset.tool));
});

canvas.addEventListener("pointerdown", event => {
  if (running) return;

  const point = pointFromEvent(event);

  if (tool === "path") {
    drawing = true;
    pathPoints.push(point);
    canvas.setPointerCapture(event.pointerId);
    draw();
    return;
  }

  if (tool === "robot") {
    robot = point;
  }

  if (tool === "plant") {
    plants.push(point);
  }

  if (tool === "erase") {
    const distance = (a, b) =>
      Math.hypot(a.x - b.x, a.y - b.y);

    if (robot && distance(robot, point) < 0.05) {
      robot = null;
    } else {
      const index = plants.findIndex(
        plant => distance(plant, point) < 0.05
      );

      if (index !== -1) plants.splice(index, 1);
    }
  }

  updateCounts();
  draw();
});

canvas.addEventListener("pointermove", event => {
  if (!drawing || tool !== "path") return;

  pathPoints.push(pointFromEvent(event));
  draw();
});

function endDrawing() {
  drawing = false;
  updateCounts();
}

canvas.addEventListener("pointerup", endDrawing);
canvas.addEventListener("pointercancel", endDrawing);

function updateCounts() {
  document.getElementById("plantCount").textContent = plants.length;
  document.getElementById("pathCount").textContent = pathPoints.length;
}

function addLog(message) {
  const log = document.getElementById("eventLog");
  const entry = document.createElement("p");

  entry.textContent =
    new Date().toLocaleTimeString() + " — " + message;

  log.prepend(entry);

  while (log.children.length > 25) {
    log.removeChild(log.lastChild);
  }
}

async function startCamera() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Open this page through localhost to use the camera.");
    }

    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });

    video.srcObject = stream;
    video.style.display = "block";
    placeholder.style.display = "none";
    sampleMode = false;

    document.getElementById("startCamera").disabled = true;
    document.getElementById("stopCamera").disabled = false;

    addLog("Camera started.");
    resizeCanvas();
  } catch (error) {
    addLog("Camera error: " + error.message);
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }

  video.srcObject = null;
  video.style.display = "none";
  placeholder.style.display = "flex";

  document.getElementById("startCamera").disabled = false;
  document.getElementById("stopCamera").disabled = true;
}

document.getElementById("startCamera").addEventListener("click", startCamera);
document.getElementById("stopCamera").addEventListener("click", stopCamera);

document.getElementById("sampleField").addEventListener("click", () => {
  sampleMode = true;
  placeholder.style.display = "none";
  video.style.display = "none";

  if (!robot) robot = { x: 0.12, y: 0.8 };

  if (!plants.length) {
    plants = [
      { x: 0.35, y: 0.25 },
      { x: 0.65, y: 0.30 },
      { x: 0.78, y: 0.70 }
    ];
  }

  if (!pathPoints.length) {
    pathPoints = [
      { x: 0.12, y: 0.8 },
      { x: 0.2, y: 0.6 },
      { x: 0.35, y: 0.25 },
      { x: 0.5, y: 0.5 },
      { x: 0.65, y: 0.3 },
      { x: 0.78, y: 0.7 }
    ];
  }

  updateCounts();
  draw();
  addLog("Sample field loaded.");
});

function limitsAreValid() {
  const minimum = Number(minSlider.value);
  const maximum = Number(maxSlider.value);
  const valid = maximum > minimum;

  document.getElementById("rangeWarning")
    .classList.toggle("hidden", valid);

  document.getElementById("startAuto").disabled = !valid || running;

  return valid;
}

minSlider.addEventListener("input", () => {
  document.getElementById("minValue").textContent = minSlider.value;
  limitsAreValid();
});

maxSlider.addEventListener("input", () => {
  document.getElementById("maxValue").textContent = maxSlider.value;
  limitsAreValid();
});

function setStatus(status, task) {
  const pill = document.getElementById("statusPill");

  pill.textContent = status;
  pill.classList.toggle("running", status === "Running");

  document.getElementById("currentTask").textContent = task;
}

function updateProgress(percent) {
  document.getElementById("progressText").textContent =
    Math.round(percent) + "%";

  document.getElementById("progressBar").style.width =
    Math.min(100, Math.max(0, percent)) + "%";
}

function startAuto() {
  if (!limitsAreValid()) return;

  if (!robot) {
    addLog("Place the red robot marker first.");
    return;
  }

  if (!plants.length) {
    addLog("Add at least one plant.");
    return;
  }

  if (pathPoints.length < 2) {
    addLog("Draw a route with at least two points.");
    return;
  }

  running = true;
  currentPlant = 0;
  wateringTicks = 0;
  pumpOn = false;

  document.getElementById("startAuto").disabled = true;
  document.getElementById("stopAuto").disabled = false;

  setStatus("Running", "Following planned route");
  addLog("Auto simulation started; no hardware is connected.");

  let phase = 0;

  timer = setInterval(() => {
    if (currentPlant >= plants.length) {
      stopAuto();
      setStatus("Complete", "All plants processed");
      updateProgress(100);
      addLog("Simulation complete.");
      return;
    }

    const minimum = Number(minSlider.value);
    const maximum = Number(maxSlider.value);

    if (phase === 0) {
      setStatus("Running", "Moving to plant " + (currentPlant + 1));

      // Simulated moisture reading, not a real sensor value.
      moisture = Math.floor(Math.random() * 51) + 20;

      document.getElementById("moistureReading").textContent =
        moisture + "% (simulated)";

      addLog("Reached plant " + (currentPlant + 1) +
        ". Simulated moisture: " + moisture + "%.");

      if (moisture < minimum) {
        pumpOn = true;
        wateringTicks = 0;
        addLog("Below minimum: simulated pump ON.");
      } else {
        pumpOn = false;
        addLog("Soil moisture sufficient; watering skipped.");
      }

      phase = 1;
    } else if (pumpOn) {
      // Simulate moisture rising during watering.
      moisture = Math.min(maximum, moisture + 5 + Math.floor(Math.random() * 5));
      wateringTicks++;

      document.getElementById("moistureReading").textContent =
        moisture + "% (simulated)";

      if (moisture >= maximum || wateringTicks >= 8) {
        pumpOn = false;

        addLog(moisture >= maximum
          ? "Maximum reached: simulated pump OFF."
          : "Safety timeout: simulated pump OFF.");

        phase = 2;
      }
    } else if (phase === 1) {
      phase = 2;
    } else {
      currentPlant++;
      updateProgress(currentPlant / plants.length * 100);

      if (currentPlant < plants.length) {
        addLog("Proceeding to plant " + (currentPlant + 1) + ".");
      }

      phase = 0;
    }

    document.getElementById("pumpState").textContent =
      pumpOn ? "ON (simulated)" : "OFF";
  }, 1200);
}

function stopAuto() {
  running = false;

  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  pumpOn = false;
  document.getElementById("pumpState").textContent = "OFF";
  document.getElementById("stopAuto").disabled = true;
  document.getElementById("startAuto").disabled = !limitsAreValid();

  if (document.getElementById("statusPill").textContent === "Running") {
    setStatus("Stopped", "Automation stopped");
  }

  addLog("Simulation stopped; simulated pump OFF.");
}

document.getElementById("startAuto").addEventListener("click", startAuto);
document.getElementById("stopAuto").addEventListener("click", stopAuto);

document.getElementById("clearPlan").addEventListener("click", () => {
  stopAuto();
  robot = null;
  plants = [];
  pathPoints = [];
  updateCounts();
  draw();
  addLog("Plan cleared.");
});

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
limitsAreValid();
