// ---------- Draw Preview (Top + Side Views) ----------
function drawPreview() {
  const od = parseFloat(document.getElementById("od").value);
  const id = parseFloat(document.getElementById("id").value);
  const angle = parseFloat(document.getElementById("angle").value);
  const thk = parseFloat(document.getElementById("thk").value);

  // Top View Canvas
  const ctxTop = document.getElementById("topView").getContext("2d");
  ctxTop.clearRect(0, 0, 240, 240);

  // Side View Canvas
  const ctxSide = document.getElementById("sideView").getContext("2d");
  ctxSide.clearRect(0, 0, 320, 280);

  // --------- Top View ---------
  ctxTop.save();
  ctxTop.translate(120, 120); // Center origin
  ctxTop.strokeStyle = "#4f46e5"; // Accent color
  ctxTop.lineWidth = 2;
  ctxTop.beginPath();
  ctxTop.arc(0, 0, od * 3, 0, 2 * Math.PI); // Outer circle
  ctxTop.stroke();
  ctxTop.beginPath();
  ctxTop.arc(0, 0, id * 3, 0, 2 * Math.PI); // Inner circle
  ctxTop.stroke();
  ctxTop.restore();

  // --------- Side View ---------
  const scale = 3; // 3px = 1mm (adjust for clarity)
  const coneDepth = ((od - id) / 2) / Math.tan((angle / 2) * (Math.PI / 180));
  const centerX = 160;
  const topY = 40;

  // Material Block (Rectangle)
  ctxSide.strokeStyle = "#999";
  ctxSide.lineWidth = 1;
  ctxSide.strokeRect(centerX - 100, topY, 200, thk * scale);

  // Countersink + Through Hole (Polyline)
  ctxSide.strokeStyle = "#4f46e5";
  ctxSide.lineWidth = 2;
  ctxSide.beginPath();
  ctxSide.moveTo(centerX - (od / 2) * scale, topY); // Top-left
  ctxSide.lineTo(centerX + (od / 2) * scale, topY); // Top-right
  ctxSide.lineTo(centerX + (id / 2) * scale, topY + coneDepth * scale); // Cone right
  ctxSide.lineTo(centerX + (id / 2) * scale, topY + thk * scale); // Through right
  ctxSide.lineTo(centerX - (id / 2) * scale, topY + thk * scale); // Through left
  ctxSide.lineTo(centerX - (id / 2) * scale, topY + coneDepth * scale); // Cone left
  ctxSide.closePath();
  ctxSide.stroke();

  // Hatch Lines (for cone)
  ctxSide.setLineDash([5, 4]); // Dashed pattern
  ctxSide.beginPath();
  ctxSide.moveTo(centerX - (od / 2) * scale, topY);
  ctxSide.lineTo(centerX - (id / 2) * scale, topY + coneDepth * scale);
  ctxSide.moveTo(centerX + (od / 2) * scale, topY);
  ctxSide.lineTo(centerX + (id / 2) * scale, topY + coneDepth * scale);
  ctxSide.stroke();
  ctxSide.setLineDash([]); // Reset to solid
}

// ---------- Generate DXF File ----------
function generateDXF() {
  const od = parseFloat(document.getElementById("od").value);
  const id = parseFloat(document.getElementById("id").value);
  const angle = parseFloat(document.getElementById("angle").value);
  const thk = parseFloat(document.getElementById("thk").value);
  const coneDepth = ((od - id) / 2) / Math.tan((angle / 2) * (Math.PI / 180));

  let dxf = "0\nSECTION\n2\nENTITIES\n";

  // --------- Top View (Circles) ---------
  dxf += `0\nCIRCLE\n8\nTOP_VIEW\n10\n0\n20\n0\n30\n0\n40\n${od / 2}\n`; // Outer circle
  dxf += `0\nCIRCLE\n8\nTOP_VIEW\n10\n0\n20\n0\n30\n0\n40\n${id / 2}\n`; // Inner circle

  // --------- Side View (Cross-Section) ---------
  const offX = 3 * od; // Offset from top view
  const yTop = 0;
  const yCone = coneDepth;
  const yBot = thk;
  const halfOD = od / 2;
  const halfID = id / 2;

  // Helper: Add a line to DXF
  function addLine(x1, y1, x2, y2) {
    dxf += `0\nLINE\n8\nSIDE_VIEW\n10\n${(x1 + offX).toFixed(3)}\n20\n${-y1.toFixed(3)}\n11\n${(x2 + offX).toFixed(3)}\n21\n${-y2.toFixed(3)}\n`;
  }

  // Cone Edges
  addLine(-halfOD, yTop, -halfID, yCone);
  addLine(halfOD, yTop, halfID, yCone);

  // Top Surface & Hole Edges
  addLine(-halfOD, yTop, halfOD, yTop); // Top edge
  addLine(-halfID, yCone, -halfID, yBot); // Left through hole
  addLine(halfID, yCone, halfID, yBot); // Right through hole
  addLine(-halfID, yBot, halfID, yBot); // Bottom edge

  dxf += "0\nENDSEC\n0\nEOF";

  // Download DXF
  const blob = new Blob([dxf], { type: "application/dxf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Countersink_Hole.dxf";
  link.click();
}

// --------- Event Listeners ---------
document.querySelectorAll("input").forEach((input) => {
  input.addEventListener("input", drawPreview);
});

// Initial Preview
drawPreview();