const BACKEND_BOX_URL   = "https://maskback.up.railway.app/segment_box";
const BACKEND_POINT_URL = "https://maskback.up.railway.app/segment_point";

const fileInput   = document.getElementById("fileInput");
const canvas      = document.getElementById("canvas");
const ctx         = canvas.getContext("2d");
const maskBtn     = document.getElementById("maskBtn");
const downloadLink= document.getElementById("downloadLink");
const modeTapBtn  = document.getElementById("modeTap");
const modeBoxBtn  = document.getElementById("modeBox");

let img = new Image();
let currentFile = null;
let selectionMode = "tap"; // 'tap' | 'box'
let points = [];           // [{x,y,label:1}]
let start = null;          // box start
let box = null;            // {x1,y1,x2,y2}

function setMode(m) {
  selectionMode = m;
  if (m === "tap") {
    modeTapBtn.classList.replace("bg-slate-700", "bg-emerald-600");
    modeBoxBtn.classList.replace("bg-emerald-600", "bg-slate-700");
  } else {
    modeBoxBtn.classList.replace("bg-slate-700", "bg-emerald-600");
    modeTapBtn.classList.replace("bg-emerald-600", "bg-slate-700");
  }
  resetSelection();
}

function resetSelection() {
  points = [];
  box = null;
  maskBtn.disabled = true;
  draw();
}

function draw() {
  if (!img.src) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  if (selectionMode === "tap") {
    points.forEach(p => {
      ctx.fillStyle = "#22d3ee";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (box) {
    const {x1,y1,x2,y2} = box;
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  }
}

function scale(value, axis) {
  return Math.round(value * (axis === "x" ? img.naturalWidth / canvas.width : img.naturalHeight / canvas.height));
}

fileInput.addEventListener("change", e => {
  const f = e.target.files[0];
  if (!f) return;
  currentFile = f;
  const reader = new FileReader();
  reader.onload = ev => {
    img.onload = () => {
      const max = Math.min(window.innerWidth - 32, img.naturalWidth);
      canvas.width  = max;
      canvas.height = max * (img.naturalHeight / img.naturalWidth);
      resetSelection();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(f);
});

canvas.addEventListener("pointerdown", e => {
  if (!img.src) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (selectionMode === "tap") {
    points.push({x, y, label:1});
    maskBtn.disabled = points.length === 0;
    draw();
  } else {
    start = {x, y};
    box = {x1:x, y1:y, x2:x, y2:y};
    draw();
    canvas.setPointerCapture(e.pointerId);
  }
});

canvas.addEventListener("pointermove", e => {
  if (selectionMode === "box" && start) {
    const rect = canvas.getBoundingClientRect();
    box.x2 = e.clientX - rect.left;
    box.y2 = e.clientY - rect.top;
    draw();
  }
});

canvas.addEventListener("pointerup", () => {
  if (selectionMode === "box") {
    start = null;
    maskBtn.disabled = !box;
  }
});

maskBtn.addEventListener("click", async () => {
  if (!currentFile) return;

  const form = new FormData();
  form.append("file", currentFile);

  let url = BACKEND_POINT_URL;
  if (selectionMode === "tap") {
    form.append("points", JSON.stringify(points.map(p => ({
      x: scale(p.x, "x"), y: scale(p.y, "y"), label:1
    }))));
  } else {
    const tlx = Math.min(box.x1, box.x2);
    const tly = Math.min(box.y1, box.y2);
    const brx = Math.max(box.x1, box.x2);
    const bry = Math.max(box.y1, box.y2);
    form.append("x1", scale(tlx, "x"));
    form.append("y1", scale(tly, "y"));
    form.append("x2", scale(brx, "x"));
    form.append("y2", scale(bry, "y"));
    url = BACKEND_BOX_URL;
  }

  maskBtn.textContent = "Processing…";
  maskBtn.disabled = true;
  try {
    const res  = await fetch(url, {method:"POST", body:form});
    const blob = await res.blob();
    const dl   = URL.createObjectURL(blob);
    downloadLink.href = dl;
    downloadLink.download = "mask.png";
    downloadLink.classList.remove("hidden");
  } catch(err) {
    alert(err);
  } finally {
    maskBtn.textContent = "Generate Mask";
    resetSelection();
  }
});

modeTapBtn.addEventListener("click", () => setMode("tap"));
modeBoxBtn.addEventListener("click", () => setMode("box"));

setMode("tap"); // default