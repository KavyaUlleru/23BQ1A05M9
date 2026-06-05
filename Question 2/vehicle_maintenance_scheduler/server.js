const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 3000;

const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiIyM2JxMWEwNW05QHZ2aXQubmV0IiwiZXhwIjoxNzgwNjQxOTYyLCJpYXQiOjE3ODA2NDEwNjIsImlzcyI6IkFmZm9yZCBNZWRpY2FsIFRlY2hub2xvZ2llcyBQcml2YXRlIExpbWl0ZWQiLCJqdGkiOiI4ZjEzODcxMi1lNzE5LTRlNTAtYmIzZS1jMjdkOGM2MWM0NTIiLCJsb2NhbGUiOiJlbi1JTiIsIm5hbWUiOiJrYXZ5YSB1bGxlcnUiLCJzdWIiOiIxZDE1NWNmYi0yNDU4LTQ4NTctOGYyNS1kZmZmMDBhN2RhNDkifSwiZW1haWwiOiIyM2JxMWEwNW05QHZ2aXQubmV0IiwibmFtZSI6ImthdnlhIHVsbGVydSIsInJvbGxObyI6IjIzYnExYTA1bTkiLCJhY2Nlc3NDb2RlIjoiUVFkRVl5IiwiY2xpZW50SUQiOiIxZDE1NWNmYi0yNDU4LTQ4NTctOGYyNS1kZmZmMDBhN2RhNDkiLCJjbGllbnRTZWNyZXQiOiJmRXFCbVVOaHZHWlZBUFlRIn0.vjs2r9y-kVvnOsSOSdOvv37spCIqFCzFcUMeLP0yZ5U";

const api = axios.create({
  baseURL: "http://4.224.186.213/evaluation-service",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
});

function knapsack(tasks, capacity) {
  const n = tasks.length;

  const dp = Array.from(
    { length: n + 1 },
    () => Array(capacity + 1).fill(0)
  );

  for (let i = 1; i <= n; i++) {
    const duration = tasks[i - 1].Duration;
    const impact = tasks[i - 1].Impact;

    for (let h = 0; h <= capacity; h++) {
      if (duration <= h) {
        dp[i][h] = Math.max(
          dp[i - 1][h],
          dp[i - 1][h - duration] + impact
        );
      } else {
        dp[i][h] = dp[i - 1][h];
      }
    }
  }

  const selected = [];
  let h = capacity;

  for (let i = n; i > 0; i--) {
    if (dp[i][h] !== dp[i - 1][h]) {
      selected.push(tasks[i - 1]);
      h -= tasks[i - 1].Duration;
    }
  }

  selected.reverse();

  return {
    totalImpact: selected.reduce(
      (sum, task) => sum + task.Impact,
      0
    ),
    totalDuration: selected.reduce(
      (sum, task) => sum + task.Duration,
      0
    ),
    selectedTasks: selected,
  };
}

app.get("/", (req, res) => {
  res.send("Vehicle Maintenance Scheduler Running");
});

// Test Vehicles API
app.get("/test-vehicles", async (req, res) => {
  try {
    const response = await api.get("/vehicles");
    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      error: error.response?.data || error.message,
    });
  }
});

app.get("/test-depots", async (req, res) => {
  try {
    const response = await api.get("/depots");
    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      error: error.response?.data || error.message,
    });
  }
});

app.get("/vehicle-scheduling", async (req, res) => {
  try {
    console.log("Fetching depots...");
    const depotResponse = await api.get("/depots");

    console.log("Fetching vehicles...");
    const vehicleResponse = await api.get("/vehicles");

    console.log(
      "DEPOTS RESPONSE:",
      JSON.stringify(depotResponse.data, null, 2)
    );

    console.log(
      "VEHICLES RESPONSE:",
      JSON.stringify(vehicleResponse.data, null, 2)
    );

    const depots =
      depotResponse.data.depots ||
      depotResponse.data.Depots ||
      depotResponse.data.data ||
      [];

    const vehicles =
      vehicleResponse.data.vehicles ||
      vehicleResponse.data.Vehicles ||
      vehicleResponse.data.data ||
      [];

    if (!depots.length) {
      return res.status(400).json({
        success: false,
        message:
          "No depots found. Check API response structure.",
        apiResponse: depotResponse.data,
      });
    }

    if (!vehicles.length) {
      return res.status(400).json({
        success: false,
        message:
          "No vehicles found. Check API response structure.",
        apiResponse: vehicleResponse.data,
      });
    }

    const results = depots.map((depot) => {
      const capacity =
        depot.MechanicHours ||
        depot.mechanicHours ||
        depot.hours;

      const optimal = knapsack(
        vehicles,
        capacity
      );

      return {
        depotId: depot.ID || depot.id,
        mechanicHours: capacity,
        totalImpact: optimal.totalImpact,
        totalDuration: optimal.totalDuration,
        selectedTasks: optimal.selectedTasks.map(
          (task) => ({
            taskId: task.TaskID,
            duration: task.Duration,
            impact: task.Impact,
          })
        ),
      };
    });

    res.status(200).json({
      success: true,
      depotCount: results.length,
      data: results,
    });
  } catch (error) {
    console.log(
      "STATUS:",
      error.response?.status
    );

    console.log(
      "ERROR:",
      JSON.stringify(
        error.response?.data,
        null,
        2
      )
    );

    res.status(500).json({
      success: false,
      error:
        error.response?.data ||
        error.message ||
        "Unknown Error",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(
    `Open http://localhost:${PORT}/vehicle-scheduling`
  );
});
