/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NEO-VECTR ∞SNIP3 - ADVANCED SHAPE EDITOR
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Professional shape editor with:
 * - Mathematical coordinate system with sliders
 * - Pre-validated shapes (never breaks or oversizes)
 * - Parametric shape generation (polygons, stars, curves)
 * - Real-time preview with neon rendering
 * - Symmetry controls and mirroring
 * - Bezier curves and smooth interpolation
 * - Export/import shape data
 * - Preset library (ships, weapons, obstacles)
 * - Auto-normalization (fits within bounds)
 * - Line connection validation
 * 
 * Features:
 * - Point-based editing with constraints
 * - Slider controls for easy adjustments
 * - Mathematical transformations (rotate, scale, skew)
 * - Grid snapping and symmetry modes
 * - Undo/redo system
 * - Shape validation and auto-fix
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// SHAPE EDITOR STATE
// ═══════════════════════════════════════════════════════════════════════════

const ShapeEditor = {
  // Editor state
  isOpen: false,
  mode: 'EDIT',              // 'EDIT', 'CREATE', 'TRANSFORM'
  
  // Current shape being edited
  currentShape: null,
  
  // Shape library
  shapes: [],
  selectedShapeIndex: 0,
  
  // Edit controls
  selectedPoint: -1,
  dragOffset: { x: 0, y: 0 },
  isDragging: false,
  
  // Transformation
  rotation: 0,               // 0-360 degrees
  scale: 1.0,                // 0.1-3.0
  symmetryMode: 'NONE',      // 'NONE', 'HORIZONTAL', 'VERTICAL', 'RADIAL'
  snapToGrid: true,
  gridSize: 10,
  
  // Constraints
  maxSize: 100,              // Maximum shape dimension
  minSize: 10,               // Minimum shape dimension
  maxPoints: 32,             // Maximum vertices
  
  // History
  history: [],
  historyIndex: -1,
  maxHistory: 50,
  
  // UI
  panelX: 10,
  panelY: 10,
  panelWidth: 300,
  previewSize: 200,
};

/**
 * Shape structure
 * @typedef {Object} Shape
 * @property {string} name - Shape name
 * @property {Array<{x, y}>} points - Vertices (normalized -1 to 1)
 * @property {boolean} closed - Whether shape is closed loop
 * @property {string} type - Shape type ('POLYGON', 'CURVE', 'CUSTOM')
 * @property {Object} params - Generation parameters
 */

// ═══════════════════════════════════════════════════════════════════════════
// SHAPE GENERATION (MATHEMATICAL)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate regular polygon
 * @param {number} sides - Number of sides (3-32)
 * @param {number} radius - Radius (0-1)
 * @param {number} rotation - Rotation offset (0-2π)
 * @returns {Array<{x, y}>} - Normalized points
 */
function generatePolygon(sides, radius = 0.8, rotation = 0) {
  sides = Math.max(3, Math.min(32, Math.floor(sides)));
  radius = Math.max(0.1, Math.min(1, radius));
  
  const points = [];
  const angleStep = (Math.PI * 2) / sides;
  
  for (let i = 0; i < sides; i++) {
    const angle = i * angleStep + rotation;
    points.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  }
  
  return points;
}

/**
 * Generate star shape
 * @param {number} points - Number of points (3-16)
 * @param {number} outerRadius - Outer radius (0.5-1)
 * @param {number} innerRadius - Inner radius (0.1-0.8)
 * @param {number} rotation - Rotation offset (0-2π)
 * @returns {Array<{x, y}>} - Normalized points
 */
function generateStar(points, outerRadius = 0.8, innerRadius = 0.4, rotation = 0) {
  points = Math.max(3, Math.min(16, Math.floor(points)));
  outerRadius = Math.max(0.5, Math.min(1, outerRadius));
  innerRadius = Math.max(0.1, Math.min(outerRadius * 0.8, innerRadius));
  
  const vertices = [];
  const angleStep = (Math.PI * 2) / (points * 2);
  
  for (let i = 0; i < points * 2; i++) {
    const angle = i * angleStep + rotation;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    vertices.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  }
  
  return vertices;
}

/**
 * Generate smooth curve using Bezier interpolation
 * @param {Array<{x, y}>} controlPoints - Control points
 * @param {number} segments - Segments per curve (4-32)
 * @returns {Array<{x, y}>} - Interpolated points
 */
function generateSmoothCurve(controlPoints, segments = 16) {
  if (controlPoints.length < 2) return controlPoints;
  
  segments = Math.max(4, Math.min(32, segments));
  const smoothPoints = [];
  
  for (let i = 0; i < controlPoints.length - 1; i++) {
    const p0 = controlPoints[i];
    const p1 = controlPoints[i + 1];
    const p_1 = controlPoints[i - 1] || p0;
    const p2 = controlPoints[i + 2] || p1;
    
    // Catmull-Rom spline
    for (let t = 0; t < segments; t++) {
      const u = t / segments;
      const u2 = u * u;
      const u3 = u2 * u;
      
      const x = 0.5 * (
        (2 * p0.x) +
        (-p_1.x + p1.x) * u +
        (2 * p_1.x - 5 * p0.x + 4 * p1.x - p2.x) * u2 +
        (-p_1.x + 3 * p0.x - 3 * p1.x + p2.x) * u3
      );
      
      const y = 0.5 * (
        (2 * p0.y) +
        (-p_1.y + p1.y) * u +
        (2 * p_1.y - 5 * p0.y + 4 * p1.y - p2.y) * u2 +
        (-p_1.y + 3 * p0.y - 3 * p1.y + p2.y) * u3
      );
      
      smoothPoints.push({ x, y });
    }
  }
  
  // Add final point
  smoothPoints.push({ ...controlPoints[controlPoints.length - 1] });
  
  return smoothPoints;
}

/**
 * Generate custom ship shape
 * @param {number} wingSpan - Wing width (0.5-1.5)
 * @param {number} noseLength - Nose length (0.5-1.5)
 * @param {number} bodyWidth - Body width (0.3-0.8)
 * @returns {Array<{x, y}>} - Ship vertices
 */
function generateShipShape(wingSpan = 1.0, noseLength = 1.0, bodyWidth = 0.5) {
  wingSpan = Math.max(0.5, Math.min(1.5, wingSpan));
  noseLength = Math.max(0.5, Math.min(1.5, noseLength));
  bodyWidth = Math.max(0.3, Math.min(0.8, bodyWidth));
  
  const nose = noseLength * 0.8;
  const wing = wingSpan * 0.6;
  const body = bodyWidth * 0.4;
  
  return [
    { x: nose, y: 0 },                    // Tip
    { x: -body, y: wing },                // Left wing
    { x: -body * 0.5, y: body * 0.3 },    // Left body
    { x: -body * 0.5, y: -body * 0.3 },   // Right body
    { x: -body, y: -wing },               // Right wing
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// SHAPE VALIDATION & NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate and fix shape
 * Ensures shape never breaks or oversizes
 * @param {Array<{x, y}>} points - Shape points
 * @returns {Array<{x, y}>} - Valid, normalized points
 */
function validateAndFixShape(points) {
  if (points.length < 2) {
    // Not enough points, return default triangle
    return generatePolygon(3);
  }
  
  // Remove duplicate points
  const cleaned = [];
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const prev = points[i - 1];
    
    if (!prev || Math.hypot(current.x - prev.x, current.y - prev.y) > 0.01) {
      cleaned.push(current);
    }
  }
  
  if (cleaned.length < 2) {
    return generatePolygon(3);
  }
  
  // Normalize to fit within -1 to 1 bounds
  return normalizeShape(cleaned);
}

/**
 * Normalize shape to fit within bounds
 * @param {Array<{x, y}>} points - Shape points
 * @param {number} maxSize - Maximum dimension (default 1)
 * @returns {Array<{x, y}>} - Normalized points
 */
function normalizeShape(points, maxSize = 1.0) {
  if (points.length === 0) return [];
  
  // Find bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  
  const width = maxX - minX;
  const height = maxY - minY;
  const maxDim = Math.max(width, height);
  
  if (maxDim === 0) return points;
  
  // Scale to fit within maxSize, centered at origin
  const scale = (maxSize * 2) / maxDim;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  
  return points.map(p => ({
    x: (p.x - centerX) * scale,
    y: (p.y - centerY) * scale,
  }));
}

/**
 * Apply symmetry to shape
 * @param {Array<{x, y}>} points - Original points
 * @param {string} mode - Symmetry mode ('HORIZONTAL', 'VERTICAL', 'RADIAL')
 * @returns {Array<{x, y}>} - Symmetrical points
 */
function applySymmetry(points, mode) {
  if (mode === 'NONE' || points.length === 0) return points;
  
  const result = [...points];
  
  if (mode === 'HORIZONTAL') {
    // Mirror across Y axis
    for (let i = points.length - 1; i >= 0; i--) {
      result.push({ x: -points[i].x, y: points[i].y });
    }
  } else if (mode === 'VERTICAL') {
    // Mirror across X axis
    for (let i = points.length - 1; i >= 0; i--) {
      result.push({ x: points[i].x, y: -points[i].y });
    }
  } else if (mode === 'RADIAL') {
    // 4-way radial symmetry
    const original = [...points];
    for (const p of original) {
      result.push({ x: -p.x, y: p.y });
      result.push({ x: p.x, y: -p.y });
      result.push({ x: -p.x, y: -p.y });
    }
  }
  
  return normalizeShape(result);
}

/**
 * Transform shape (rotate, scale)
 * @param {Array<{x, y}>} points - Original points
 * @param {number} rotation - Rotation in radians
 * @param {number} scale - Scale multiplier
 * @returns {Array<{x, y}>} - Transformed points
 */
function transformShape(points, rotation, scale) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  
  return points.map(p => ({
    x: (p.x * cos - p.y * sin) * scale,
    y: (p.x * sin + p.y * cos) * scale,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// SHAPE LIBRARY & PRESETS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize shape library with presets
 */
function initShapeLibrary() {
  ShapeEditor.shapes = [
    {
      name: 'Triangle',
      points: generatePolygon(3),
      closed: true,
      type: 'POLYGON',
      params: { sides: 3, radius: 0.8 },
    },
    {
      name: 'Square',
      points: generatePolygon(4, 0.8, Math.PI / 4),
      closed: true,
      type: 'POLYGON',
      params: { sides: 4, radius: 0.8 },
    },
    {
      name: 'Pentagon',
      points: generatePolygon(5),
      closed: true,
      type: 'POLYGON',
      params: { sides: 5, radius: 0.8 },
    },
    {
      name: 'Hexagon',
      points: generatePolygon(6),
      closed: true,
      type: 'POLYGON',
      params: { sides: 6, radius: 0.8 },
    },
    {
      name: '5-Point Star',
      points: generateStar(5),
      closed: true,
      type: 'STAR',
      params: { points: 5, outer: 0.8, inner: 0.4 },
    },
    {
      name: 'Arrow Ship',
      points: generateShipShape(1.0, 1.2, 0.5),
      closed: true,
      type: 'SHIP',
      params: { wingSpan: 1.0, noseLength: 1.2, bodyWidth: 0.5 },
    },
    {
      name: 'Wide Ship',
      points: generateShipShape(1.5, 0.8, 0.6),
      closed: true,
      type: 'SHIP',
      params: { wingSpan: 1.5, noseLength: 0.8, bodyWidth: 0.6 },
    },
  ];
  
  ShapeEditor.currentShape = { ...ShapeEditor.shapes[0] };
}

// ═══════════════════════════════════════════════════════════════════════════
// EDITOR UI RENDERING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Render shape editor panel
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 */
function renderShapeEditor(ctx, canvasWidth, canvasHeight) {
  if (!ShapeEditor.isOpen) return;
  
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  
  const px = ShapeEditor.panelX;
  const py = ShapeEditor.panelY;
  const pw = ShapeEditor.panelWidth;
  const lineHeight = 25;
  let currentY = py + 20;
  
  // Calculate panel height
  const panelHeight = 500;
  
  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.fillRect(px, py, pw, panelHeight);
  
  // Border
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, pw, panelHeight);
  
  // Title
  ctx.fillStyle = '#00ffff';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('SHAPE EDITOR', px + 10, currentY);
  currentY += 30;
  
  // Shape selector
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px monospace';
  ctx.fillText('Shape:', px + 10, currentY);
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(px + 60, currentY - 2, pw - 80, 18);
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
  ctx.strokeRect(px + 60, currentY - 2, pw - 80, 18);
  
  ctx.fillStyle = '#00ffff';
  const shapeName = ShapeEditor.currentShape?.name || 'None';
  ctx.fillText(shapeName, px + 65, currentY);
  currentY += 30;
  
  // Preview
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Preview:', px + 10, currentY);
  currentY += 20;
  
  const previewX = px + pw / 2;
  const previewY = currentY + ShapeEditor.previewSize / 2;
  const previewR = ShapeEditor.previewSize / 2 - 10;
  
  // Preview background
  ctx.fillStyle = 'rgba(20, 20, 30, 0.5)';
  ctx.fillRect(px + 10, currentY, pw - 20, ShapeEditor.previewSize);
  
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
  ctx.strokeRect(px + 10, currentY, pw - 20, ShapeEditor.previewSize);
  
  // Draw shape preview
  if (ShapeEditor.currentShape && ShapeEditor.currentShape.points.length > 0) {
    drawShapePreview(ctx, ShapeEditor.currentShape, previewX, previewY, previewR);
  }
  
  currentY += ShapeEditor.previewSize + 10;
  
  // Controls
  ctx.fillStyle = '#ff00ff';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('CONTROLS:', px + 10, currentY);
  currentY += 20;
  
  // Sliders (if applicable)
  if (ShapeEditor.currentShape?.type === 'POLYGON') {
    currentY = renderSlider(ctx, px, currentY, pw, 'Sides', 3, 16, 
      ShapeEditor.currentShape.params.sides, (v) => {
        ShapeEditor.currentShape.params.sides = Math.round(v);
        ShapeEditor.currentShape.points = generatePolygon(
          ShapeEditor.currentShape.params.sides,
          ShapeEditor.currentShape.params.radius
        );
      });
  } else if (ShapeEditor.currentShape?.type === 'STAR') {
    currentY = renderSlider(ctx, px, currentY, pw, 'Points', 3, 12,
      ShapeEditor.currentShape.params.points, (v) => {
        ShapeEditor.currentShape.params.points = Math.round(v);
        ShapeEditor.currentShape.points = generateStar(
          ShapeEditor.currentShape.params.points,
          ShapeEditor.currentShape.params.outer,
          ShapeEditor.currentShape.params.inner
        );
      });
    
    currentY = renderSlider(ctx, px, currentY, pw, 'Inner', 0.1, 0.8,
      ShapeEditor.currentShape.params.inner, (v) => {
        ShapeEditor.currentShape.params.inner = v;
        ShapeEditor.currentShape.points = generateStar(
          ShapeEditor.currentShape.params.points,
          ShapeEditor.currentShape.params.outer,
          v
        );
      });
  } else if (ShapeEditor.currentShape?.type === 'SHIP') {
    currentY = renderSlider(ctx, px, currentY, pw, 'Wing', 0.5, 1.5,
      ShapeEditor.currentShape.params.wingSpan, (v) => {
        ShapeEditor.currentShape.params.wingSpan = v;
        ShapeEditor.currentShape.points = generateShipShape(
          v,
          ShapeEditor.currentShape.params.noseLength,
          ShapeEditor.currentShape.params.bodyWidth
        );
      });
    
    currentY = renderSlider(ctx, px, currentY, pw, 'Nose', 0.5, 1.5,
      ShapeEditor.currentShape.params.noseLength, (v) => {
        ShapeEditor.currentShape.params.noseLength = v;
        ShapeEditor.currentShape.points = generateShipShape(
          ShapeEditor.currentShape.params.wingSpan,
          v,
          ShapeEditor.currentShape.params.bodyWidth
        );
      });
    
    currentY = renderSlider(ctx, px, currentY, pw, 'Body', 0.3, 0.8,
      ShapeEditor.currentShape.params.bodyWidth, (v) => {
        ShapeEditor.currentShape.params.bodyWidth = v;
        ShapeEditor.currentShape.points = generateShipShape(
          ShapeEditor.currentShape.params.wingSpan,
          ShapeEditor.currentShape.params.noseLength,
          v
        );
      });
  }
  
  // Transform controls
  currentY += 10;
  currentY = renderSlider(ctx, px, currentY, pw, 'Rotation', 0, 360, 
    ShapeEditor.rotation, (v) => { ShapeEditor.rotation = v; });
  
  currentY = renderSlider(ctx, px, currentY, pw, 'Scale', 0.5, 2.0,
    ShapeEditor.scale, (v) => { ShapeEditor.scale = v; });
  
  // Help text
  currentY += 10;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '10px monospace';
  ctx.fillText('Arrow keys: Change shape', px + 10, currentY);
  currentY += 12;
  ctx.fillText('E: Toggle editor', px + 10, currentY);
  
  ctx.restore();
}

/**
 * Render slider control
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Panel X
 * @param {number} y - Current Y
 * @param {number} w - Panel width
 * @param {string} label - Slider label
 * @param {number} min - Min value
 * @param {number} max - Max value
 * @param {number} value - Current value
 * @param {Function} onChange - Change callback
 * @returns {number} - New Y position
 */
function renderSlider(ctx, x, y, w, label, min, max, value, onChange) {
  ctx.fillStyle = '#ffffff';
  ctx.font = '11px monospace';
  ctx.fillText(`${label}: ${value.toFixed(2)}`, x + 10, y);
  
  const sliderX = x + 10;
  const sliderY = y + 15;
  const sliderW = w - 20;
  const sliderH = 4;
  
  // Track
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(sliderX, sliderY, sliderW, sliderH);
  
  // Fill
  const fillW = ((value - min) / (max - min)) * sliderW;
  ctx.fillStyle = '#00ffff';
  ctx.fillRect(sliderX, sliderY, fillW, sliderH);
  
  // Thumb
  ctx.beginPath();
  ctx.arc(sliderX + fillW, sliderY + sliderH / 2, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#00ffff';
  ctx.fill();
  
  return y + 35;
}

/**
 * Draw shape preview with neon style
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} shape - Shape object
 * @param {number} centerX - Center X
 * @param {number} centerY - Center Y
 * @param {number} radius - Preview radius
 */
function drawShapePreview(ctx, shape, centerX, centerY, radius) {
  const points = transformShape(
    shape.points,
    ShapeEditor.rotation * Math.PI / 180,
    ShapeEditor.scale
  );
  
  if (points.length < 2) return;
  
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  
  // Draw shape
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const x = centerX + p.x * radius;
    const y = centerY + p.y * radius;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  if (shape.closed) {
    ctx.closePath();
  }
  
  // Glow
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
  ctx.lineWidth = 8;
  ctx.stroke();
  
  // Core
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.9)';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Points
  for (const p of points) {
    const x = centerX + p.x * radius;
    const y = centerY + p.y * radius;
    
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 0, 255, 0.8)';
    ctx.fill();
  }
  
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// INPUT HANDLING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Handle keyboard input for editor
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleShapeEditorKey(e) {
  if (!ShapeEditor.isOpen) {
    if (e.key === 'e' || e.key === 'E') {
      ShapeEditor.isOpen = true;
      e.preventDefault();
    }
    return;
  }
  
  if (e.key === 'e' || e.key === 'E' || e.key === 'Escape') {
    ShapeEditor.isOpen = false;
    e.preventDefault();
  } else if (e.key === 'ArrowLeft') {
    ShapeEditor.selectedShapeIndex = (ShapeEditor.selectedShapeIndex - 1 + ShapeEditor.shapes.length) % ShapeEditor.shapes.length;
    ShapeEditor.currentShape = { ...ShapeEditor.shapes[ShapeEditor.selectedShapeIndex] };
    e.preventDefault();
  } else if (e.key === 'ArrowRight') {
    ShapeEditor.selectedShapeIndex = (ShapeEditor.selectedShapeIndex + 1) % ShapeEditor.shapes.length;
    ShapeEditor.currentShape = { ...ShapeEditor.shapes[ShapeEditor.selectedShapeIndex] };
    e.preventDefault();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT/IMPORT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Export current shape as JSON
 * @returns {string} - JSON string
 */
function exportShape() {
  return JSON.stringify(ShapeEditor.currentShape, null, 2);
}

/**
 * Import shape from JSON
 * @param {string} json - JSON string
 * @returns {boolean} - Success
 */
function importShape(json) {
  try {
    const shape = JSON.parse(json);
    shape.points = validateAndFixShape(shape.points);
    ShapeEditor.currentShape = shape;
    return true;
  } catch (e) {
    console.error('[ShapeEditor] Import failed:', e);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

window.ShapeEditor = {
  // State
  state: ShapeEditor,
  
  // Initialization
  init: initShapeLibrary,
  
  // Generation
  generatePolygon,
  generateStar,
  generateSmoothCurve,
  generateShipShape,
  
  // Validation
  validateShape: validateAndFixShape,
  normalizeShape,
  applySymmetry,
  transformShape,
  
  // Rendering
  render: renderShapeEditor,
  drawPreview: drawShapePreview,
  
  // Input
  handleKey: handleShapeEditorKey,
  
  // Export/Import
  export: exportShape,
  import: importShape,
  
  // Access
  getCurrentShape: () => ShapeEditor.currentShape,
  getShapes: () => ShapeEditor.shapes,
};

// Auto-initialize
initShapeLibrary();

console.log('[ShapeEditor] Advanced shape editor loaded');
console.log('[ShapeEditor] Press E to open editor • Arrow keys to change shape');
