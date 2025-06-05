const BACKEND_URL = "https://maskback.up.railway.app/segment"; // 🔁 change after deploy

const fileInput = document.getElementById("fileInput");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const maskBtn = document.getElementById("maskBtn");
const downloadLink = document.getElementById("downloadLink");

let img = new Image();
let currentFile = null;
let start = null;
let box = null; // {x1,y1,x2,y2} in canvas space

// ---- helpers ----
function draw() {
  if (!img.src) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  if (box) {
    const { x1, y1, x2, y2 } = box;
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  }
}

function scaleToOriginal(value, axis) {
  // canvas to original image px
  return Math.round(value * (axis === "x" ? img.naturalWidth / canvas.width : img.naturalHeight / canvas.height));
}

// ---- events ----
fileInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  currentFile = file;
  const reader = new FileReader();
  reader.onload = ev => {
    img.onload = () => {
      // resize canvas to fit max‑width (mobile safe)
      const max = Math.min(window.innerWidth - 32, img.naturalWidth);
      const ratio = img.naturalHeight / img.naturalWidth;
      canvas.width = max;
      canvas.height = max * ratio;
      box = null;
      draw();
      maskBtn.disabled = true;
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

canvas.addEventListener("pointerdown", e => {
  if (!img.src) return;
  const rect = canvas.getBoundingClientRect();
  start = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  box = { ...start, x2: start.x, y2: start.y };
  draw();
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener("pointermove", e => {
  if (!start) return;
  const rect = canvas.getBoundingClientRect();
  box.x2 = e.clientX - rect.left;
  box.y2 = e.clientY - rect.top;
  draw();
});

canvas.addEventListener("pointerup", () => {
  start = null;
  if (box) maskBtn.disabled = false;
});

maskBtn.addEventListener("click", async () => {
  if (!box || !currentFile) return;
  // normalise box → top‑left / bottom‑right
  const topLeftX = Math.min(box.x1, box.x2);
  const topLeftY = Math.min(box.y1, box.y2);
  const botRightX = Math.max(box.x1, box.x2);
  const botRightY = Math.max(box.y1, box.y2);

  const form = new FormData();
  form.append("file", currentFile);
  form.append("x1", scaleToOriginal(topLeftX, "x"));
  form.append("y1", scaleToOriginal(topLeftY, "y"));
  form.append("x2", scaleToOriginal(botRightX, "x"));
  form.append("y2", scaleToOriginal(botRightY, "y"));

  maskBtn.textContent = "Processing…";
  maskBtn.disabled = true;
  try {
    const res = await fetch(BACKEND_URL, { method: "POST", body: form });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = "mask.png";
    downloadLink.textContent = "Download mask";
    downloadLink.classList.remove("hidden");
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    maskBtn.textContent = "Generate Mask";
  }
});
