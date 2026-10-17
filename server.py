
from flask import Flask, jsonify, request, send_from_directory
from pathlib import Path
import random
import time

ROOT = Path(__file__).resolve().parent

app = Flask(__name__, static_folder=None)

state = {
    "mode": "idle",
    "task": "Waiting for plan",
    "moisture": None,
    "pump_on": False,
    "event": "Python service ready",
    "updated_at": time.time()
}


@app.get("/")
def home():
    return send_from_directory(ROOT, "index.html")


@app.get("/<path:filename>")
def static_files(filename):
    if filename not in {"style.css", "app.js"}:
        return jsonify({"error": "Not found"}), 404

    return send_from_directory(ROOT, filename)


@app.get("/api/status")
def status():
    return jsonify(state)


@app.post("/api/simulate-reading")
def simulate_reading():
    data = request.get_json(silent=True) or {}

    minimum = int(data.get("minimum", 35))
    maximum = int(data.get("maximum", 65))

    if not 0 <= minimum < maximum <= 100:
        return jsonify({
            "error": "Require 0 <= minimum < maximum <= 100"
        }), 400

    reading = int(data.get("reading", random.randint(20, 70)))
    reading = max(0, min(100, reading))

    if reading < minimum:
        action = "water"
        message = (
            f"Moisture is {reading}%. "
            "Below minimum; watering would be requested."
        )
    else:
        action = "skip"
        message = (
            f"Moisture is {reading}%. "
            "At or above minimum; watering is skipped."
        )

    state.update({
        "mode": "simulation",
        "task": "Plant moisture check",
        "moisture": reading,
        "pump_on": False,
        "event": message,
        "updated_at": time.time()
    })

    return jsonify({
        "reading": reading,
        "minimum": minimum,
        "maximum": maximum,
        "action": action,
        "message": message,
        "state": state
    })


@app.post("/api/stop")
def stop():
    state.update({
        "mode": "idle",
        "task": "Stopped",
        "pump_on": False,
        "event": "Simulation stopped; pump state OFF",
        "updated_at": time.time()
    })

    return jsonify(state)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
