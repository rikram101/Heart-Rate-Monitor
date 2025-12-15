// Initialize elements
const viewSelector = document.getElementById("viewSelector");
const datePicker = document.getElementById("datePicker");
const summarySection = document.getElementById("summarySection");
const detailedSection = document.getElementById("detailedSection");

// 1. Safety Check: Ensure the device ID is available before proceeding.
if (!CURRENT_DEVICE_ID) {
  console.error("Initialization failed: Device ID is not available.");
  // Optionally display an error message on the screen here
  // return; // Uncomment to stop execution if the ID is critical and missing
}

// 2. Set Date Picker to LATEST_READING_DATE (Passed from EJS template)
if (LATEST_READING_DATE && LATEST_READING_DATE !== "null") {
  datePicker.value = LATEST_READING_DATE; // Use value since it's already 'YYYY-MM-DD' string
} else {
  // Fallback to today if no date was found
  datePicker.valueAsDate = new Date();
}

// Chart Instances (to destroy/recreate later)
let heartRateChartInstance = null;
let spo2ChartInstance = null;

// --- EVENT LISTENERS ---

// 1. Switch Views
viewSelector.addEventListener("change", (e) => {
  if (e.target.value === "summary") {
    detailedSection.classList.add("d-none");
    summarySection.classList.remove("d-none");
    datePicker.classList.add("d-none"); // Hide date picker for summary
    loadSummaryData();
  } else {
    summarySection.classList.add("d-none");
    detailedSection.classList.remove("d-none");
    datePicker.classList.remove("d-none");
    loadDetailedData(datePicker.value);
  }
});

// 2. Change Date (Detailed View)
datePicker.addEventListener("change", (e) => {
  loadDetailedData(e.target.value);
});

// Initial Load
loadDetailedData(datePicker.value);

// --- FUNCTION: LOAD WEEKLY SUMMARY ---
async function loadSummaryData() {
  try {
    const res = await fetch(`/patient/readings/${CURRENT_DEVICE_ID}/summary`);
    const data = await res.json();

    if (data.success && data.summary) {
      const s = data.summary;
      // Update DOM elements
      document.getElementById("avgHeartRate").innerText = Math.round(
        s.heartRate.avg || 0
      );
      document.getElementById("minHeartRate").innerText =
        s.heartRate.min || "-";
      document.getElementById("maxHeartRate").innerText =
        s.heartRate.max || "-";

      document.getElementById("avgSpo2").innerText =
        Math.round(s.spo2.avg || 0) + "%";
      document.getElementById("minSpo2").innerText = (s.spo2.min || "-") + "%";
      document.getElementById("maxSpo2").innerText = (s.spo2.max || "-") + "%";
    }
  } catch (err) {
    console.error("Failed to load summary", err);
  }
}

// --- FUNCTION: LOAD DETAILED CHARTS ---
async function loadDetailedData(dateString) {
  try {
    const res = await fetch(
      `/patient/readings/${CURRENT_DEVICE_ID}/daily?date=${dateString}`
    );
    const json = await res.json();

    if (json.success) {
      renderCharts(json.data.heartRate, json.data.spo2);
    }
  } catch (err) {
    console.error("Failed to load daily charts", err);
  }
}

// --- FUNCTION: RENDER CHARTS WITH CHART.JS ---
function renderCharts(hrData, spo2Data) {
  // Destroy existing charts if they exist to prevent overlap
  if (heartRateChartInstance) heartRateChartInstance.destroy();
  if (spo2ChartInstance) spo2ChartInstance.destroy();

  // 1. Heart Rate Chart Configuration
  const ctxHR = document.getElementById("heartRateChart").getContext("2d");
  heartRateChartInstance = new Chart(ctxHR, {
    type: "line",
    data: {
      datasets: [
        {
          label: "Heart Rate (BPM)",
          data: hrData, // Expects {x: time, y: value} format
          borderColor: "#dc3545",
          backgroundColor: "rgba(220, 53, 69, 0.1)",
          borderWidth: 2,
          pointRadius: 3,
          fill: true,
          tension: 0.3, // Smooth curves
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          type: "time", // Requires chartjs-adapter-date-fns
          time: {
            unit: "hour",
            displayFormats: { hour: "HH:mm" },
          },
          title: { display: true, text: "Time of Day" },
        },
        y: {
          title: { display: true, text: "BPM" },
          suggestedMin: 40,
          suggestedMax: 120,
        },
      },
    },
  });

  // 2. SpO2 Chart Configuration
  const ctxSpo2 = document.getElementById("spo2Chart").getContext("2d");
  spo2ChartInstance = new Chart(ctxSpo2, {
    type: "line",
    data: {
      datasets: [
        {
          label: "SpO2 (%)",
          data: spo2Data,
          borderColor: "#0d6efd",
          backgroundColor: "rgba(13, 110, 253, 0.1)",
          borderWidth: 2,
          pointRadius: 3,
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          type: "time",
          time: {
            unit: "hour",
            displayFormats: { hour: "HH:mm" },
          },
          title: { display: true, text: "Time of Day" },
        },
        y: {
          title: { display: true, text: "Percentage (%)" },
          min: 80, // SpO2 is usually 95-100, dropping below 80 is rare/critical
          max: 100,
        },
      },
    },
  });
}
