const scale = 6;
const displaySize = 500;
const canvasSize = displaySize * scale;
const exportScale = 2; // Added here, at the top with other global variables

const canvas = document.getElementById("radialChart");
canvas.width = canvasSize;
canvas.height = canvasSize;
canvas.style.width = `${displaySize}px`;
canvas.style.height = `${displaySize}px`;

const ctx = canvas.getContext("2d", { alpha: true });
ctx.clearRect(0, 0, canvasSize, canvasSize);

const centerX = canvasSize / 2;
const centerY = canvasSize / 2;
const totalLayers = 67;
const centerHole = 18;
const ringThickness = 10;
const gapThickness = 3;
const sliceGapThickness = 3;

const colors = ["#F2F2F2", "#e6e6e6", "#cccccc", "#999999"];
const blueColors = ["#CEE5DA", "#6EC5CD", "#076C98", "#182E57"];
const benchmarkColor = "#F47B54";
const averageColor = "#FFFF00";
const averageStrokeColor = "#444444";

let showBenchmark = true;
let showAverage = true;
let showValues = false;
let svgVerticalOffset = 10;

// Value label controls
let valueAngleOffset = 0; // degrees
let valueFontSize = 60; // px
let valueDistancePercent = 100; // percent of default gap center radius

function loadSVG(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function drawSegment(
  ctx,
  centerX,
  centerY,
  startRadius,
  endRadius,
  startAngle,
  endAngle,
  color
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(
    centerX + startRadius * Math.cos(startAngle),
    centerY + startRadius * Math.sin(startAngle)
  );
  ctx.arc(centerX, centerY, endRadius, startAngle, endAngle);
  ctx.lineTo(
    centerX + startRadius * Math.cos(endAngle),
    centerY + startRadius * Math.sin(endAngle)
  );
  ctx.arc(centerX, centerY, startRadius, endAngle, startAngle, true);
  ctx.closePath();
  ctx.fill();
}

function drawGap(ctx, centerX, centerY, angle, width, length) {
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(angle);
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillRect(-width / 2, 0, width, length);
  ctx.restore();
}

function drawAverageLayer(
  centerX,
  centerY,
  layerIndex,
  startAngle,
  endAngle,
  layerThickness
) {
  const baseStartRadius = layerIndex * layerThickness;
  const baseEndRadius = baseStartRadius + layerThickness;
  const midRadius = (baseStartRadius + baseEndRadius) / 2;

  const protrusion = 10 * scale;
  const protrusionAngle = Math.asin(protrusion / midRadius);

  const midAngle = (startAngle + endAngle) / 2;
  const newStartAngle = midAngle - protrusionAngle;
  const newEndAngle = midAngle + protrusionAngle;

  const thicknessIncrease = layerThickness * 1.2;
  const startRadius = baseStartRadius - thicknessIncrease / 2;
  const endRadius = baseEndRadius + thicknessIncrease / 2;

  const strokeWidth = 7 * scale;
  const circleRadius = (endRadius - startRadius) / 2;

  const startCircleX = centerX + midRadius * Math.cos(newStartAngle);
  const startCircleY = centerY + midRadius * Math.sin(newStartAngle);
  const endCircleX = centerX + midRadius * Math.cos(newEndAngle);
  const endCircleY = centerY + midRadius * Math.sin(newEndAngle);

  return {
    startCircle: { x: startCircleX, y: startCircleY, radius: circleRadius },
    endCircle: { x: endCircleX, y: endCircleY, radius: circleRadius },
    mainShape: {
      startRadius,
      endRadius,
      startAngle: Math.max(startAngle, newStartAngle),
      endAngle: Math.min(endAngle, newEndAngle),
    },
    protrusions: {
      startRadius: startRadius,
      endRadius: endRadius,
      startAngle: newStartAngle,
      endAngle: newEndAngle,
    },
    strokeWidth,
  };
}

async function drawChart(
  ctx,
  canvasWidth,
  canvasHeight,
  scores,
  benchmarks,
  averages
) {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const maxRadius = (canvasWidth / 2) * 0.8;
  const layerThickness = maxRadius / totalLayers;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  const sliceAngle = (Math.PI * 2) / 6;
  const rotationAngle = -Math.PI / 2;

  const averageIndicators = [];

  for (let category = 0; category < 6; category++) {
    const startAngle = category * sliceAngle + rotationAngle;
    const endAngle = (category + 1) * sliceAngle + rotationAngle;

    for (let i = 0; i < 4; i++) {
      const startRadius =
        (centerHole + i * (ringThickness + gapThickness)) * layerThickness;
      const endRadius = startRadius + ringThickness * layerThickness;

      drawSegment(
        ctx,
        centerX,
        centerY,
        startRadius,
        endRadius,
        startAngle,
        endAngle,
        colors[i]
      );

      if (showBenchmark) {
        const benchmark = benchmarks[category];
        const benchmarkLayersFilled = Math.max(
          0,
          Math.min(10, Math.floor(benchmark * 10) - i * 10)
        );
        if (benchmarkLayersFilled > 0) {
          const filledEndRadius =
            startRadius +
            (endRadius - startRadius) * (benchmarkLayersFilled / 10);
          drawSegment(
            ctx,
            centerX,
            centerY,
            startRadius,
            filledEndRadius,
            startAngle,
            endAngle,
            benchmarkColor
          );
        }
      }

      const score = scores[category];
      const scoreLayersFilled = Math.max(
        0,
        Math.min(10, Math.floor(score * 10) - i * 10)
      );
      if (scoreLayersFilled > 0) {
        const filledEndRadius =
          startRadius + (endRadius - startRadius) * (scoreLayersFilled / 10);
        drawSegment(
          ctx,
          centerX,
          centerY,
          startRadius,
          filledEndRadius,
          startAngle,
          endAngle,
          blueColors[i]
        );
      }
    }

    if (showAverage) {
      const average = averages[category];
      const averageLayer = Math.floor(average * 10) - 1;
      if (averageLayer >= 0) {
        const tierIndex = Math.floor(averageLayer / 10);
        const layerWithinTier = averageLayer % 10;
        const indicatorData = drawAverageLayer(
          centerX,
          centerY,
          centerHole +
            tierIndex * (ringThickness + gapThickness) +
            layerWithinTier,
          startAngle,
          endAngle,
          layerThickness
        );
        averageIndicators.push(indicatorData);
      }
    }
  }

  if (showAverage) {
    averageIndicators.forEach((indicator) => {
      function drawFullCircle(x, y, radius) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = averageColor;
        ctx.fill();
        ctx.strokeStyle = averageStrokeColor;
        ctx.lineWidth = indicator.strokeWidth;
        ctx.stroke();
      }

      drawFullCircle(
        indicator.startCircle.x,
        indicator.startCircle.y,
        indicator.startCircle.radius
      );
      drawFullCircle(
        indicator.endCircle.x,
        indicator.endCircle.y,
        indicator.endCircle.radius
      );

      ctx.fillStyle = averageColor;
      ctx.beginPath();
      ctx.arc(
        centerX,
        centerY,
        indicator.protrusions.endRadius,
        indicator.protrusions.startAngle,
        indicator.protrusions.endAngle
      );
      ctx.arc(
        centerX,
        centerY,
        indicator.protrusions.startRadius,
        indicator.protrusions.endAngle,
        indicator.protrusions.startAngle,
        true
      );
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.arc(
        centerX,
        centerY,
        indicator.mainShape.endRadius,
        indicator.mainShape.startAngle,
        indicator.mainShape.endAngle
      );
      ctx.arc(
        centerX,
        centerY,
        indicator.mainShape.startRadius,
        indicator.mainShape.endAngle,
        indicator.mainShape.startAngle,
        true
      );
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = averageStrokeColor;
      ctx.lineWidth = indicator.strokeWidth;
      ctx.beginPath();
      ctx.arc(
        centerX,
        centerY,
        indicator.protrusions.endRadius,
        indicator.protrusions.startAngle,
        indicator.protrusions.endAngle
      );
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(
        centerX,
        centerY,
        indicator.protrusions.startRadius,
        indicator.protrusions.endAngle,
        indicator.protrusions.startAngle,
        true
      );
      ctx.stroke();
    });
  }

  // Draw gaps last
  for (let i = 0; i < 6; i++) {
    const angle = i * sliceAngle + rotationAngle - Math.PI / 2;
    drawGap(
      ctx,
      centerX,
      centerY,
      angle,
      sliceGapThickness * layerThickness,
      maxRadius + 10 * layerThickness
    );
  }

  // Draw numeric values if showValues is true
  if (showValues) {
    // Calculate the radius for the center of the gap between the 3rd and 4th ring
    const thirdRingOuter = (centerHole + 3 * (ringThickness + gapThickness)) * layerThickness;
    const fourthRingInner = (centerHole + 3 * (ringThickness + gapThickness) + gapThickness) * layerThickness;
    let gapCenterRadius = (thirdRingOuter + fourthRingInner) / 2;
    // Apply user distance percent
    gapCenterRadius = gapCenterRadius * (valueDistancePercent / 100);

    ctx.font = `bold ${valueFontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let category = 0; category < 6; category++) {
      // Apply user angle offset (convert degrees to radians)
      const angle = category * sliceAngle + rotationAngle + (valueAngleOffset * Math.PI / 180);
      const x = centerX + gapCenterRadius * Math.cos(angle);
      const y = centerY + gapCenterRadius * Math.sin(angle);
      const value = scores[category].toFixed(1);
      // Draw black outline
      ctx.strokeStyle = 'black';
      ctx.lineWidth = Math.max(2, valueFontSize / 8);
      ctx.strokeText(value, x, y);
      // Draw white text
      ctx.fillStyle = 'white';
      ctx.fillText(value, x, y);
    }
  }

  // Load and draw the SVG
  try {
    const svgImage = await loadSVG("roundletters.svg");

    // Calculate new dimensions
    const newSvgHeight = canvasHeight * 0.88; // 75% of canvas height
    const newSvgWidth = canvasWidth * 1.0; // 95% of canvas width

    // Calculate position to center the SVG
    const svgX = (canvasWidth - newSvgWidth) / 2;
    const svgY = (canvasHeight - newSvgHeight) / 2 + svgVerticalOffset;

    // Draw the SVG with new dimensions
    ctx.drawImage(svgImage, svgX, svgY, newSvgWidth, newSvgHeight);
  } catch (error) {
    console.error("Error loading SVG:", error);
  }
}

function createInputs() {
  const sections = ["scoreInputs", "benchmarkInputs", "averageInputs"];
  sections.forEach((sectionId) => {
    const container = document.getElementById(sectionId);
    for (let i = 0; i < 6; i++) {
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.max = "4";
      input.step = "0.1";
      input.value = "0";
      input.placeholder = `${i + 1}`;
      input.addEventListener("input", updateChart);
      container.appendChild(input);
    }
  });
}

function getValues(sectionId) {
  return Array.from(document.querySelectorAll(`#${sectionId} input`)).map(
    (input) => {
      let value = parseFloat(input.value);
      return isNaN(value) ? 0 : Math.max(0, Math.min(4, value));
    }
  );
}

async function updateChart() {
  const scores = getValues("scoreInputs");
  const benchmarks = getValues("benchmarkInputs");
  const averages = getValues("averageInputs");
  await drawChart(ctx, canvasSize, canvasSize, scores, benchmarks, averages);
}

function toggleVisibility(elementId) {
  if (elementId === "toggleBenchmark") {
    showBenchmark = !showBenchmark;
  } else if (elementId === "toggleAverage") {
    showAverage = !showAverage;
  } else if (elementId === "toggleValues") {
    showValues = !showValues;
  }
  updateChart();
}

function adjustVerticalPosition(offset) {
  svgVerticalOffset = offset;
  updateChart();
}

async function exportAsPNG() {
  const fileName =
    document.getElementById("fileNameInput").value || "radial-chart";

  // Export scores only
  await exportScenario(fileName, false, false);

  // Export scores + benchmark
  await exportScenario(`${fileName}_Benchmark`, true, false);

  // Export scores + average
  await exportScenario(`${fileName}_Average`, false, true);
}

async function exportScenario(fileName, includeBenchmark, includeAverage) {
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  tempCanvas.width = canvasSize * exportScale;
  tempCanvas.height = canvasSize * exportScale;

  const scores = getValues("scoreInputs");
  const benchmarks = getValues("benchmarkInputs");
  const averages = getValues("averageInputs");

  // Temporarily set visibility flags
  const originalBenchmarkVisibility = showBenchmark;
  const originalAverageVisibility = showAverage;
  showBenchmark = includeBenchmark;
  showAverage = includeAverage;

  // Draw the chart on the temporary canvas at higher resolution
  await drawChart(
    tempCtx,
    tempCanvas.width,
    tempCanvas.height,
    scores,
    benchmarks,
    averages
  );

  // Restore original visibility settings
  showBenchmark = originalBenchmarkVisibility;
  showAverage = originalAverageVisibility;

  const dataURL = tempCanvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = `${fileName}.png`;
  link.href = dataURL;
  link.click();
}

// Add event listeners for the new controls
function setupValueControls() {
  const valueControls = document.getElementById('valueControls');
  const toggleValues = document.getElementById('toggleValues');
  const angleInput = document.getElementById('valueAngleOffset');
  const fontSizeInput = document.getElementById('valueFontSize');
  const distanceInput = document.getElementById('valueDistance');

  // Show/hide controls based on checkbox
  toggleValues.addEventListener('change', () => {
    valueControls.style.display = toggleValues.checked ? '' : 'none';
  });

  // Update variables and chart on input
  angleInput.addEventListener('input', () => {
    valueAngleOffset = parseFloat(angleInput.value) || 0;
    updateChart();
  });
  fontSizeInput.addEventListener('input', () => {
    valueFontSize = parseFloat(fontSizeInput.value) || 60;
    updateChart();
  });
  distanceInput.addEventListener('input', () => {
    valueDistancePercent = parseFloat(distanceInput.value) || 100;
    updateChart();
  });
}

// Wrap initialization in DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  createInputs();
  updateChart();
  setupValueControls();

  document.getElementById("toggleBenchmark").addEventListener("click", () => {
    toggleVisibility("toggleBenchmark");
  });

  document.getElementById("toggleAverage").addEventListener("click", () => {
    toggleVisibility("toggleAverage");
  });

  document.getElementById("toggleValues").addEventListener("click", () => {
    toggleVisibility("toggleValues");
  });

  document.getElementById("exportPNG").addEventListener("click", exportAsPNG);
});
