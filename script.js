const controlledGifs = document.querySelectorAll("img[data-gif][data-poster]");

if (window.katex) {
  document.querySelectorAll("[data-tex]").forEach((element) => {
    window.katex.render(element.dataset.tex, element, {
      displayMode: element.classList.contains("qif-tex-display"),
      throwOnError: false,
      strict: false,
    });
  });
}

function setGifState(image, shouldPlay) {
  const targetSrc = shouldPlay ? image.dataset.gif : image.dataset.poster;
  if (!targetSrc || image.getAttribute("src") === targetSrc) return;
  image.setAttribute("src", targetSrc);
}

(() => {
  const chart = document.getElementById("synaptic-chart");
  if (!chart) return;

  const namespace = "http://www.w3.org/2000/svg";
  const grid = document.getElementById("synaptic-grid");
  const spikesGroup = document.getElementById("synaptic-spikes");
  const kernelsGroup = document.getElementById("synaptic-kernels");
  const sumPath = document.getElementById("synaptic-sum");
  const spikeTimes = [0.9, 2.4, 3.05, 5.25, 7.1, 8.2];
  const tau = 0.72;
  const duration = 10;
  const bounds = { left: 64, right: 24, top: 24, divider: 91, bottom: 228 };
  const plotWidth = 900 - bounds.left - bounds.right;
  const activationTop = 112;
  const activationBottom = bounds.bottom;

  function svgElement(tag, attributes, text) {
    const element = document.createElementNS(namespace, tag);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    if (text !== undefined) element.textContent = text;
    return element;
  }

  const x = (time) => bounds.left + (time / duration) * plotWidth;
  const samples = Array.from({ length: 501 }, (_, index) => (duration * index) / 500);
  const kernel = (time, spikeTime) => time < spikeTime ? 0 : Math.exp(-(time - spikeTime) / tau) / tau;
  const totals = samples.map((time) => spikeTimes.reduce((sum, spikeTime) => sum + kernel(time, spikeTime), 0));
  const maximum = Math.max(...totals) * 1.08;
  const y = (value) => activationBottom - (value / maximum) * (activationBottom - activationTop);

  for (let time = 0; time <= duration; time += 2) {
    const position = x(time);
    grid.append(
      svgElement("line", { x1: position, y1: bounds.top, x2: position, y2: bounds.bottom, class: "synaptic-grid-line" }),
      svgElement("text", { x: position, y: bounds.bottom + 20, "text-anchor": "middle", class: "synaptic-tick-label" }, time.toFixed(0)),
    );
  }
  grid.append(
    svgElement("line", { x1: bounds.left, y1: bounds.divider, x2: 900 - bounds.right, y2: bounds.divider, class: "synaptic-lane-divider" }),
    svgElement("line", { x1: bounds.left, y1: bounds.top, x2: bounds.left, y2: bounds.bottom, class: "synaptic-axis-line" }),
    svgElement("line", { x1: bounds.left, y1: bounds.bottom, x2: 900 - bounds.right, y2: bounds.bottom, class: "synaptic-axis-line" }),
  );

  for (const spikeTime of spikeTimes) {
    const position = x(spikeTime);
    spikesGroup.append(
      svgElement("line", { x1: position, y1: 38, x2: position, y2: 76, class: "synaptic-spike-line" }),
      svgElement("circle", { cx: position, cy: 38, r: 4, class: "synaptic-spike-dot" }),
    );

    const points = samples
      .filter((time) => time >= spikeTime)
      .map((time, index) => `${index === 0 ? "M" : "L"}${x(time).toFixed(2)},${y(kernel(time, spikeTime)).toFixed(2)}`)
      .join(" ");
    kernelsGroup.append(svgElement("path", { d: points, class: "synaptic-kernel" }));
  }

  const sumPoints = samples
    .map((time, index) => `${index === 0 ? "M" : "L"}${x(time).toFixed(2)},${y(totals[index]).toFixed(2)}`)
    .join(" ");
  sumPath.setAttribute("d", sumPoints);
})();

(() => {
  const particleGroup = document.getElementById("continuity-particles");
  if (!particleGroup) return;

  const namespace = "http://www.w3.org/2000/svg";
  const trackStart = 54;
  const trackWidth = 792;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const states = [
    { phase: 0.03, y: 72, factor: 1.18, center: 0.45 },
    { phase: 0.12, y: 94, factor: 0.78, center: 0.50 },
    { phase: 0.24, y: 118, factor: 1.34, center: 0.47, pauseCycle: 5.4, pauseDuration: 0.9, pauseOffset: 0.2 },
    { phase: 0.34, y: 82, factor: 0.92, center: 0.52 },
    { phase: 0.40, y: 108, factor: 1.08, center: 0.44 },
    { phase: 0.46, y: 68, factor: 0.70, center: 0.49 },
    { phase: 0.52, y: 121, factor: 1.22, center: 0.54 },
    { phase: 0.60, y: 91, factor: 0.84, center: 0.46, pauseCycle: 6.1, pauseDuration: 1.2, pauseOffset: 2.4 },
    { phase: 0.73, y: 112, factor: 1.40, center: 0.51 },
    { phase: 0.87, y: 76, factor: 1.02, center: 0.48 },
  ];

  for (const state of states) {
    const circle = document.createElementNS(namespace, "circle");
    circle.setAttribute("class", "continuity-particle");
    circle.setAttribute("cy", state.y);
    circle.setAttribute("r", 6);
    particleGroup.append(circle);
    state.element = circle;
  }

  for (const resting of [{ phase: 0.455, y: 84 }, { phase: 0.49, y: 115 }]) {
    const circle = document.createElementNS(namespace, "circle");
    circle.setAttribute("class", "continuity-particle is-resting");
    circle.setAttribute("cx", trackStart + resting.phase * trackWidth);
    circle.setAttribute("cy", resting.y);
    circle.setAttribute("r", 6);
    particleGroup.append(circle);
  }

  function drawStates() {
    for (const state of states) state.element.setAttribute("cx", trackStart + state.phase * trackWidth);
  }

  drawStates();
  if (reducedMotion) return;

  let previousTime = performance.now();
  function animateContinuity(now) {
    const deltaTime = Math.min(0.04, Math.max(0, (now - previousTime) / 1000));
    const elapsed = now / 1000;
    previousTime = now;

    for (const state of states) {
      const paused = state.pauseCycle && ((elapsed + state.pauseOffset) % state.pauseCycle) < state.pauseDuration;
      if (!paused) {
        const distanceFromSlowRegion = Math.abs(state.phase - state.center);
        const speed = state.factor * (0.055 + 0.58 * Math.pow(distanceFromSlowRegion, 1.8));
        state.phase = (state.phase + speed * deltaTime) % 1;
      }
    }
    drawStates();
    requestAnimationFrame(animateContinuity);
  }
  requestAnimationFrame(animateContinuity);
})();

(() => {
  const chart = document.getElementById("density-speed-chart");
  if (!chart) return;

  const namespace = "http://www.w3.org/2000/svg";
  const grid = document.getElementById("density-speed-grid");
  const speedPath = document.getElementById("speed-path");
  const densityPath = document.getElementById("density-path");
  const densityFill = document.getElementById("density-fill");
  const neuronDots = document.getElementById("density-neuron-dots");
  const bounds = { left: 70, right: 30, speedTop: 28, speedBottom: 145, densityTop: 190, densityBottom: 322 };
  const plotWidth = 900 - bounds.left - bounds.right;
  const voltageMinimum = -3;
  const voltageMaximum = 3;
  const offset = 0.35;

  function svgElement(tag, attributes, text) {
    const element = document.createElementNS(namespace, tag);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    if (text !== undefined) element.textContent = text;
    return element;
  }

  const x = (voltage) => bounds.left + ((voltage - voltageMinimum) / (voltageMaximum - voltageMinimum)) * plotWidth;
  const speed = (voltage) => voltage * voltage + offset;
  const density = (voltage) => 1 / speed(voltage);
  const maximumSpeed = speed(voltageMaximum);
  const maximumDensity = density(0);
  const ySpeed = (value) => bounds.speedBottom - (value / maximumSpeed) * (bounds.speedBottom - bounds.speedTop);
  const yDensity = (value) => bounds.densityBottom - (value / maximumDensity) * (bounds.densityBottom - bounds.densityTop);

  for (let voltage = voltageMinimum; voltage <= voltageMaximum; voltage += 1) {
    const position = x(voltage);
    grid.append(
      svgElement("line", { x1: position, y1: bounds.speedTop, x2: position, y2: bounds.densityBottom, class: "density-grid-line" }),
      svgElement("text", { x: position, y: bounds.densityBottom + 22, "text-anchor": "middle", class: "density-tick-label" }, voltage.toFixed(0)),
    );
  }
  grid.append(
    svgElement("line", { x1: bounds.left, y1: bounds.speedBottom, x2: 900 - bounds.right, y2: bounds.speedBottom, class: "density-axis-line" }),
    svgElement("line", { x1: bounds.left, y1: bounds.densityBottom, x2: 900 - bounds.right, y2: bounds.densityBottom, class: "density-axis-line" }),
    svgElement("line", { x1: bounds.left, y1: 168, x2: 900 - bounds.right, y2: 168, class: "density-panel-divider" }),
  );

  const samples = Array.from({ length: 401 }, (_, index) => voltageMinimum + ((voltageMaximum - voltageMinimum) * index) / 400);
  speedPath.setAttribute("d", samples.map((voltage, index) => `${index === 0 ? "M" : "L"}${x(voltage).toFixed(2)},${ySpeed(speed(voltage)).toFixed(2)}`).join(" "));
  const densityLine = samples.map((voltage, index) => `${index === 0 ? "M" : "L"}${x(voltage).toFixed(2)},${yDensity(density(voltage)).toFixed(2)}`).join(" ");
  densityPath.setAttribute("d", densityLine);
  densityFill.setAttribute("d", `M${x(voltageMinimum)},${bounds.densityBottom} ${densityLine.replace(/^M/, "L")} L${x(voltageMaximum)},${bounds.densityBottom} Z`);

  const neuronVoltages = [-2.75, -2.2, -1.75, -1.35, -1.05, -0.82, -0.62, -0.47, -0.34, -0.24, -0.15, -0.07, 0, 0.07, 0.15, 0.24, 0.34, 0.47, 0.62, 0.82, 1.05, 1.35, 1.75, 2.2, 2.75];
  neuronVoltages.forEach((voltage, index) => {
    neuronDots.append(svgElement("circle", {
      cx: x(voltage),
      cy: bounds.densityBottom - 7 - (index % 3) * 7,
      r: 3.3,
      class: "density-neuron-dot",
    }));
  });
})();

(() => {
  const chart = document.getElementById("heterogeneity-chart");
  if (!chart) return;

  const namespace = "http://www.w3.org/2000/svg";
  const meanInput = document.getElementById("heterogeneity-mean");
  const deltaInput = document.getElementById("heterogeneity-delta");
  const meanOutput = document.getElementById("heterogeneity-mean-value");
  const deltaOutput = document.getElementById("heterogeneity-delta-value");
  const grid = document.getElementById("heterogeneity-grid");
  const fill = document.getElementById("heterogeneity-fill");
  const path = document.getElementById("heterogeneity-path");
  const centerLine = document.getElementById("heterogeneity-center-line");
  const widthLine = document.getElementById("heterogeneity-width-line");
  const widthStart = document.getElementById("heterogeneity-width-start");
  const widthEnd = document.getElementById("heterogeneity-width-end");
  const centerLabel = document.getElementById("heterogeneity-center-label");
  const widthLabel = document.getElementById("heterogeneity-width-label");
  const complexChart = document.getElementById("complex-contour-chart");
  const complexGrid = document.getElementById("complex-contour-grid");
  const complexRealPath = document.getElementById("complex-contour-real");
  const complexArcPath = document.getElementById("complex-contour-arc");
  const lowerPole = document.getElementById("complex-pole-lower");
  const upperPole = document.getElementById("complex-pole-upper");
  const lowerPoleLabel = document.getElementById("complex-pole-lower-label");
  const upperPoleLabel = document.getElementById("complex-pole-upper-label");
  const complexMeanInput = document.getElementById("complex-contour-mean");
  const complexDeltaInput = document.getElementById("complex-contour-delta");
  const complexMeanOutput = document.getElementById("complex-contour-mean-value");
  const complexDeltaOutput = document.getElementById("complex-contour-delta-value");
  const bounds = { left: 66, right: 26, top: 22, bottom: 306 };
  const etaMinimum = -6;
  const etaMaximum = 6;
  const densityMaximum = 1.35;
  const plotWidth = 900 - bounds.left - bounds.right;
  const plotHeight = bounds.bottom - bounds.top;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let displayedMean = meanInput.valueAsNumber;
  let displayedDelta = deltaInput.valueAsNumber;
  let animationFrame = 0;
  let displayedComplexMean = complexMeanInput.valueAsNumber;
  let displayedComplexDelta = complexDeltaInput.valueAsNumber;
  let complexAnimationFrame = 0;

  function svgElement(tag, attributes, text) {
    const element = document.createElementNS(namespace, tag);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function formatSigned(value) {
    const absolute = Math.abs(value).toFixed(2);
    return value < 0 ? `−${absolute}` : absolute;
  }

  const x = (eta) => bounds.left + ((eta - etaMinimum) / (etaMaximum - etaMinimum)) * plotWidth;
  const y = (density) => bounds.bottom - (density / densityMaximum) * plotHeight;
  const lorentzian = (eta, mean, delta) => (delta / Math.PI) / ((eta - mean) ** 2 + delta ** 2);

  for (let eta = etaMinimum; eta <= etaMaximum; eta += 2) {
    const position = x(eta);
    grid.append(
      svgElement("line", { x1: position, y1: bounds.top, x2: position, y2: bounds.bottom, class: "heterogeneity-grid-line" }),
      svgElement("text", { x: position, y: bounds.bottom + 21, "text-anchor": "middle", class: "heterogeneity-tick-label" }, eta.toFixed(0)),
    );
  }

  for (let density = 0; density <= 1.25; density += 0.25) {
    const position = y(density);
    grid.append(
      svgElement("line", { x1: bounds.left, y1: position, x2: 900 - bounds.right, y2: position, class: "heterogeneity-grid-line" }),
      svgElement("text", { x: bounds.left - 10, y: position + 4, "text-anchor": "end", class: "heterogeneity-tick-label" }, density.toFixed(2)),
    );
  }

  grid.append(
    svgElement("line", { x1: bounds.left, y1: bounds.top, x2: bounds.left, y2: bounds.bottom, class: "heterogeneity-axis-line" }),
    svgElement("line", { x1: bounds.left, y1: bounds.bottom, x2: 900 - bounds.right, y2: bounds.bottom, class: "heterogeneity-axis-line" }),
  );

  const complexBounds = { left: 68, right: 34, top: 38, bottom: 372 };
  const complexRealMinimum = -6;
  const complexRealMaximum = 6;
  const complexImaginaryMinimum = -3;
  const complexImaginaryMaximum = 3;
  const complexX = (real) => complexBounds.left + ((real - complexRealMinimum) / (complexRealMaximum - complexRealMinimum)) * (900 - complexBounds.left - complexBounds.right);
  const complexY = (imaginary) => complexBounds.top + ((complexImaginaryMaximum - imaginary) / (complexImaginaryMaximum - complexImaginaryMinimum)) * (complexBounds.bottom - complexBounds.top);

  if (complexChart) {
    for (let real = -6; real <= 6; real += 2) {
      const position = complexX(real);
      complexGrid.append(
        svgElement("line", { x1: position, y1: complexBounds.top, x2: position, y2: complexBounds.bottom, class: "complex-grid-line" }),
        svgElement("text", { x: position, y: complexY(0) + 21, "text-anchor": "middle", class: "complex-tick-label" }, real.toFixed(0)),
      );
    }

    for (let imaginary = -3; imaginary <= 3; imaginary += 1) {
      const position = complexY(imaginary);
      complexGrid.append(
        svgElement("line", { x1: complexBounds.left, y1: position, x2: 900 - complexBounds.right, y2: position, class: "complex-grid-line" }),
        imaginary === 0
          ? document.createDocumentFragment()
          : svgElement("text", { x: complexX(0) - 10, y: position + 4, "text-anchor": "end", class: "complex-tick-label" }, `${imaginary}i`),
      );
    }

    complexGrid.append(
      svgElement("line", { x1: complexBounds.left, y1: complexY(0), x2: 900 - complexBounds.right, y2: complexY(0), class: "complex-axis-line" }),
      svgElement("line", { x1: complexX(0), y1: complexBounds.top, x2: complexX(0), y2: complexBounds.bottom, class: "complex-axis-line" }),
    );

    const contourRadius = 5.8;
    complexRealPath.setAttribute("d", `M${complexX(-contourRadius)},${complexY(0)} L${complexX(contourRadius)},${complexY(0)}`);
    const arcPoints = Array.from({ length: 121 }, (_, index) => {
      const angle = (Math.PI * index) / 120;
      const real = contourRadius * Math.cos(angle);
      const imaginary = -2.95 * Math.sin(angle);
      return `${index === 0 ? "M" : "L"}${complexX(real).toFixed(2)},${complexY(imaginary).toFixed(2)}`;
    }).join(" ");
    complexArcPath.setAttribute("d", arcPoints);
  }

  function renderComplexPlane(mean, delta) {
    if (!complexChart) return;
    const poleX = complexX(mean);
    const lowerY = complexY(-delta);
    const upperY = complexY(delta);

    lowerPole.setAttribute("cx", poleX);
    lowerPole.setAttribute("cy", lowerY);
    upperPole.setAttribute("cx", poleX);
    upperPole.setAttribute("cy", upperY);

    lowerPoleLabel.setAttribute("x", poleX + 13);
    lowerPoleLabel.setAttribute("y", lowerY + 5);
    lowerPoleLabel.textContent = `η̄ − iΔ`;
    upperPoleLabel.setAttribute("x", poleX + 13);
    upperPoleLabel.setAttribute("y", upperY + 5);
    upperPoleLabel.textContent = `η̄ + iΔ`;
  }

  function render(mean, delta) {
    const samples = Array.from(
      { length: 401 },
      (_, index) => etaMinimum + ((etaMaximum - etaMinimum) * index) / 400,
    );
    const line = samples
      .map((eta, index) => `${index === 0 ? "M" : "L"}${x(eta).toFixed(2)},${y(lorentzian(eta, mean, delta)).toFixed(2)}`)
      .join(" ");
    path.setAttribute("d", line);
    fill.setAttribute("d", `M${x(etaMinimum)},${bounds.bottom} ${line.replace(/^M/, "L")} L${x(etaMaximum)},${bounds.bottom} Z`);

    const peak = lorentzian(mean, mean, delta);
    const halfHeight = peak / 2;
    const centerX = x(mean);
    const widthEndX = x(mean + delta);
    const halfY = y(halfHeight);

    centerLine.setAttribute("x1", centerX);
    centerLine.setAttribute("x2", centerX);
    centerLine.setAttribute("y1", y(peak));
    centerLine.setAttribute("y2", bounds.bottom);
    widthLine.setAttribute("x1", centerX);
    widthLine.setAttribute("x2", widthEndX);
    widthLine.setAttribute("y1", halfY);
    widthLine.setAttribute("y2", halfY);
    widthStart.setAttribute("cx", centerX);
    widthStart.setAttribute("cy", halfY);
    widthEnd.setAttribute("cx", widthEndX);
    widthEnd.setAttribute("cy", halfY);

    centerLabel.setAttribute("x", centerX);
    centerLabel.setAttribute("y", bounds.bottom - 9);
    centerLabel.setAttribute("text-anchor", "middle");
    centerLabel.textContent = `η̄ = ${formatSigned(mean)}`;
    widthLabel.setAttribute("x", (centerX + widthEndX) / 2);
    widthLabel.setAttribute("y", halfY - 10);
    widthLabel.setAttribute("text-anchor", "middle");
    widthLabel.textContent = `Δ = ${delta.toFixed(2)}`;
  }

  function update() {
    const targetMean = meanInput.valueAsNumber;
    const targetDelta = deltaInput.valueAsNumber;
    meanOutput.value = formatSigned(targetMean);
    deltaOutput.value = targetDelta.toFixed(2);
    cancelAnimationFrame(animationFrame);

    if (reducedMotion) {
      displayedMean = targetMean;
      displayedDelta = targetDelta;
      render(displayedMean, displayedDelta);
      return;
    }

    const startMean = displayedMean;
    const startDelta = displayedDelta;
    const startTime = performance.now();
    const duration = 220;

    function animate(now) {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - (1 - progress) ** 3;
      displayedMean = startMean + (targetMean - startMean) * eased;
      displayedDelta = startDelta + (targetDelta - startDelta) * eased;
      render(displayedMean, displayedDelta);
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    }

    animationFrame = requestAnimationFrame(animate);
  }

  meanInput.addEventListener("input", update);
  deltaInput.addEventListener("input", update);

  function updateComplexPlane() {
    const targetMean = complexMeanInput.valueAsNumber;
    const targetDelta = complexDeltaInput.valueAsNumber;
    complexMeanOutput.value = formatSigned(targetMean);
    complexDeltaOutput.value = targetDelta.toFixed(2);
    cancelAnimationFrame(complexAnimationFrame);

    if (reducedMotion) {
      displayedComplexMean = targetMean;
      displayedComplexDelta = targetDelta;
      renderComplexPlane(displayedComplexMean, displayedComplexDelta);
      return;
    }

    const startMean = displayedComplexMean;
    const startDelta = displayedComplexDelta;
    const startTime = performance.now();
    const duration = 220;

    function animate(now) {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - (1 - progress) ** 3;
      displayedComplexMean = startMean + (targetMean - startMean) * eased;
      displayedComplexDelta = startDelta + (targetDelta - startDelta) * eased;
      renderComplexPlane(displayedComplexMean, displayedComplexDelta);
      if (progress < 1) complexAnimationFrame = requestAnimationFrame(animate);
    }

    complexAnimationFrame = requestAnimationFrame(animate);
  }

  complexMeanInput.addEventListener("input", updateComplexPlane);
  complexDeltaInput.addEventListener("input", updateComplexPlane);
  render(displayedMean, displayedDelta);
  renderComplexPlane(displayedComplexMean, displayedComplexDelta);
})();

if ("IntersectionObserver" in window) {
  const gifObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        setGifState(entry.target, entry.intersectionRatio >= 0.999);
      }
    },
    { threshold: [0, 0.5, 0.999, 1] },
  );

  controlledGifs.forEach((image) => {
    setGifState(image, false);
    gifObserver.observe(image);
  });
} else {
  controlledGifs.forEach((image) => setGifState(image, true));
}

(() => {
  const simulator = document.getElementById("qif-simulator");
  if (!simulator) return;

  const currentInput = document.getElementById("qif-current");
  const peakInput = document.getElementById("qif-peak");
  const resetInput = document.getElementById("qif-reset");
  const currentOutput = document.getElementById("qif-current-value");
  const peakOutput = document.getElementById("qif-peak-value");
  const resetOutput = document.getElementById("qif-reset-value");
  const timeOutput = document.getElementById("qif-time-value");
  const voltageOutput = document.getElementById("qif-voltage-value");
  const rateOutput = document.getElementById("qif-rate-value");
  const toggleButton = document.getElementById("qif-animation-toggle");
  const grid = document.getElementById("qif-grid");
  const voltagePath = document.getElementById("qif-voltage-path");
  const spikeMarks = document.getElementById("qif-spike-marks");
  const peakLine = document.getElementById("qif-peak-line");
  const resetLine = document.getElementById("qif-reset-line");
  const peakLabel = document.getElementById("qif-peak-label");
  const resetLabel = document.getElementById("qif-reset-label");
  const timeCursor = document.getElementById("qif-time-cursor");
  const stateDot = document.getElementById("qif-state-dot");

  const svgNamespace = "http://www.w3.org/2000/svg";
  const chart = { width: 900, height: 360, left: 62, right: 24, top: 24, bottom: 48 };
  const duration = 12;
  const step = 0.004;
  const animationDuration = 9000;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let trajectory = [];
  let spikeTimes = [];
  let animationStart = performance.now();
  let paused = false;
  let pausedPhase = 0;

  function createSvgElement(tag, attributes, text) {
    const element = document.createElementNS(svgNamespace, tag);
    for (const [name, value] of Object.entries(attributes)) {
      element.setAttribute(name, value);
    }
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function formatSigned(value, digits = 1) {
    const formatted = Math.abs(value).toFixed(digits);
    return value < 0 ? `−${formatted}` : formatted;
  }

  function simulate(current, peak, reset) {
    const points = [{ time: 0, voltage: reset }];
    const spikes = [];
    let voltage = reset;

    for (let time = step; time <= duration + step / 2; time += step) {
      const nextVoltage = voltage + step * (voltage * voltage + current);
      if (nextVoltage >= peak) {
        const spikeTime = Math.min(time, duration);
        points.push({ time: Math.max(0, spikeTime - step * 0.15), voltage: peak });
        spikes.push(spikeTime);
        voltage = reset;
        points.push({ time: spikeTime, voltage });
      } else {
        voltage = nextVoltage;
        points.push({ time: Math.min(time, duration), voltage });
      }
    }

    return { points, spikes };
  }

  function updateSimulation() {
    const current = currentInput.valueAsNumber;
    const peak = peakInput.valueAsNumber;
    const reset = resetInput.valueAsNumber;
    const result = simulate(current, peak, reset);
    trajectory = result.points;
    spikeTimes = result.spikes;

    currentOutput.value = current.toFixed(2);
    peakOutput.value = peak.toFixed(1);
    resetOutput.value = formatSigned(reset);
    rateOutput.textContent = (spikeTimes.length / duration).toFixed(2);

    drawChart(peak, reset);
    pausedPhase = 0;
    animationStart = performance.now();
    updateAnimatedState(reducedMotion ? 1 : 0);
  }

  function drawChart(peak, reset) {
    const plotWidth = chart.width - chart.left - chart.right;
    const plotHeight = chart.height - chart.top - chart.bottom;
    const minimum = Math.min(reset - 0.75, -2.5);
    const maximum = Math.max(peak + 0.75, 2.5);
    const xScale = (time) => chart.left + (time / duration) * plotWidth;
    const yScale = (voltage) => chart.top + ((maximum - voltage) / (maximum - minimum)) * plotHeight;

    grid.replaceChildren();
    const yTickCount = 5;
    for (let index = 0; index <= yTickCount; index += 1) {
      const value = minimum + ((maximum - minimum) * index) / yTickCount;
      const y = yScale(value);
      grid.append(
        createSvgElement("line", { x1: chart.left, y1: y, x2: chart.width - chart.right, y2: y, class: "qif-grid-line" }),
        createSvgElement("text", { x: chart.left - 10, y: y + 4, "text-anchor": "end", class: "qif-tick-label" }, formatSigned(value)),
      );
    }

    for (let time = 0; time <= duration; time += 2) {
      const x = xScale(time);
      grid.append(
        createSvgElement("line", { x1: x, y1: chart.top, x2: x, y2: chart.height - chart.bottom, class: "qif-grid-line" }),
        createSvgElement("text", { x, y: chart.height - chart.bottom + 22, "text-anchor": "middle", class: "qif-tick-label" }, time.toFixed(0)),
      );
    }

    grid.append(
      createSvgElement("line", { x1: chart.left, y1: chart.top, x2: chart.left, y2: chart.height - chart.bottom, class: "qif-axis-line" }),
      createSvgElement("line", { x1: chart.left, y1: chart.height - chart.bottom, x2: chart.width - chart.right, y2: chart.height - chart.bottom, class: "qif-axis-line" }),
    );

    const pathData = trajectory
      .map((point, index) => `${index === 0 ? "M" : "L"}${xScale(point.time).toFixed(2)},${yScale(point.voltage).toFixed(2)}`)
      .join(" ");
    voltagePath.setAttribute("d", pathData);

    const peakY = yScale(peak);
    const resetY = yScale(reset);
    for (const [line, y] of [[peakLine, peakY], [resetLine, resetY]]) {
      line.setAttribute("x1", chart.left);
      line.setAttribute("x2", chart.width - chart.right);
      line.setAttribute("y1", y);
      line.setAttribute("y2", y);
    }
    peakLabel.setAttribute("x", chart.width - chart.right - 4);
    peakLabel.setAttribute("y", peakY - 8);
    peakLabel.setAttribute("text-anchor", "end");
    peakLabel.textContent = `peak Vₚ = ${peak.toFixed(1)}`;
    resetLabel.setAttribute("x", chart.width - chart.right - 4);
    resetLabel.setAttribute("y", resetY - 8);
    resetLabel.setAttribute("text-anchor", "end");
    resetLabel.textContent = `reset Vᵣ = ${formatSigned(reset)}`;

    spikeMarks.replaceChildren();
    for (const time of spikeTimes) {
      spikeMarks.append(createSvgElement("circle", { cx: xScale(time), cy: peakY, r: 5, class: "qif-spike-mark" }));
    }

    simulator.dataset.minimum = minimum;
    simulator.dataset.maximum = maximum;
  }

  function updateAnimatedState(phase) {
    if (!trajectory.length) return;
    const targetTime = Math.min(duration, Math.max(0, phase * duration));
    let low = 0;
    let high = trajectory.length - 1;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (trajectory[middle].time < targetTime) low = middle + 1;
      else high = middle;
    }

    const point = trajectory[low];
    const plotWidth = chart.width - chart.left - chart.right;
    const plotHeight = chart.height - chart.top - chart.bottom;
    const minimum = Number(simulator.dataset.minimum);
    const maximum = Number(simulator.dataset.maximum);
    const x = chart.left + (point.time / duration) * plotWidth;
    const y = chart.top + ((maximum - point.voltage) / (maximum - minimum)) * plotHeight;

    stateDot.setAttribute("cx", x);
    stateDot.setAttribute("cy", y);
    timeCursor.setAttribute("x1", x);
    timeCursor.setAttribute("x2", x);
    timeCursor.setAttribute("y1", chart.top);
    timeCursor.setAttribute("y2", chart.height - chart.bottom);
    timeOutput.textContent = point.time.toFixed(2);
    voltageOutput.textContent = formatSigned(point.voltage, 2);
  }

  function animate(now) {
    if (!paused && !reducedMotion) {
      const phase = ((now - animationStart) % animationDuration) / animationDuration;
      pausedPhase = phase;
      updateAnimatedState(phase);
    }
    requestAnimationFrame(animate);
  }

  for (const input of [currentInput, peakInput, resetInput]) {
    input.addEventListener("input", updateSimulation);
  }

  if (reducedMotion) {
    toggleButton.hidden = true;
  } else {
    toggleButton.addEventListener("click", () => {
      paused = !paused;
      toggleButton.textContent = paused ? "Resume animation" : "Pause animation";
      if (!paused) animationStart = performance.now() - pausedPhase * animationDuration;
    });
  }

  updateSimulation();
  requestAnimationFrame(animate);
})();
