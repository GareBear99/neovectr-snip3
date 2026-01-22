# NEO-VECTR ∞SNIP3 - SHAPE EDITOR GUIDE

## Overview

The **Shape Editor** is a professional-grade tool that allows players to create and customize ship shapes using mathematical controls, parametric sliders, and real-time preview. All shapes are automatically validated and normalized to prevent broken geometries or oversized ships.

---

## Quick Start

### Opening the Editor
- Press **E** to toggle the shape editor
- Press **Escape** or **E** again to close

### Navigation
- **Arrow Left/Right**: Cycle through preset shapes
- **Sliders**: Adjust shape parameters in real-time
- **Preview**: Live neon-rendered preview with transformations

---

## Features

### 1. **Mathematical Shape Generation**
The editor uses parametric equations to generate perfect shapes:
- **Polygons**: 3-32 sides with adjustable radius
- **Stars**: 3-16 points with inner/outer radius control
- **Ships**: Wing span, nose length, body width customization
- **Curves**: Catmull-Rom spline interpolation

### 2. **Automatic Validation**
All shapes are validated and fixed automatically:
- **No broken shapes**: Invalid geometries are auto-corrected
- **No oversizing**: Shapes normalized to fit within bounds
- **Duplicate removal**: Overlapping points cleaned
- **Minimum complexity**: Falls back to triangle if too simple

### 3. **Real-Time Preview**
- Neon-styled rendering with glow effects
- Rotation and scale transformations
- Vertex highlighting
- Live parameter updates

### 4. **Preset Library**
- Triangle
- Square
- Pentagon
- Hexagon
- 5-Point Star
- Arrow Ship
- Wide Ship

---

## Shape Types & Controls

### POLYGON Shapes
**Parameters:**
- **Sides**: 3-16 (integer)
  - Triangle (3), Square (4), Pentagon (5), Hexagon (6), etc.
- **Radius**: 0-1 (normalized)

**Math:**
```
angle = (i * 2π) / sides
x = cos(angle) * radius
y = sin(angle) * radius
```

### STAR Shapes
**Parameters:**
- **Points**: 3-12 (number of star points)
- **Outer Radius**: 0.5-1.0 (tip distance)
- **Inner Radius**: 0.1-0.8 (valley distance)

**Math:**
```
angle = (i * 2π) / (points * 2)
radius = (i % 2 == 0) ? outerRadius : innerRadius
x = cos(angle) * radius
y = sin(angle) * radius
```

### SHIP Shapes
**Parameters:**
- **Wing Span**: 0.5-1.5 (wing width)
- **Nose Length**: 0.5-1.5 (forward projection)
- **Body Width**: 0.3-0.8 (hull thickness)

**Vertices:**
1. Tip (nose forward)
2. Left wing
3. Left body connector
4. Right body connector
5. Right wing

---

## Transform Controls

### Rotation
- **Range**: 0-360 degrees
- **Live preview**: Shape rotates in preview window
- **Export**: Transformation applied to final shape

### Scale
- **Range**: 0.5-2.0×
- **Constraint**: Never exceeds maximum size
- **Auto-normalize**: Ensures shape fits within bounds

---

## Validation System

### Shape Validation Rules

1. **Minimum Points**: At least 2 vertices
   - If < 2: Returns default triangle
   
2. **Duplicate Removal**: Points closer than 0.01 units are merged
   - Prevents overlapping vertices
   - Cleans up redundant data
   
3. **Auto-Normalization**: Scales to fit within -1 to 1 bounds
   - Finds bounding box (minX, maxX, minY, maxY)
   - Calculates scale factor: `(2 * maxSize) / maxDim`
   - Centers at origin (0, 0)
   
4. **Size Constraints**:
   - **Max Size**: 100 units
   - **Min Size**: 10 units
   - **Max Points**: 32 vertices

---

## Advanced Features

### Symmetry Modes
```javascript
// Apply horizontal symmetry (mirror Y-axis)
ShapeEditor.applySymmetry(points, 'HORIZONTAL');

// Apply vertical symmetry (mirror X-axis)
ShapeEditor.applySymmetry(points, 'VERTICAL');

// Apply 4-way radial symmetry
ShapeEditor.applySymmetry(points, 'RADIAL');
```

### Smooth Curves
```javascript
// Generate smooth Catmull-Rom spline
const smoothPoints = ShapeEditor.generateSmoothCurve(controlPoints, 16);
```

**Math (Catmull-Rom):**
```
Given control points p_-1, p_0, p_1, p_2:
x(t) = 0.5 * (
  2*p0.x +
  (-p_-1.x + p1.x) * t +
  (2*p_-1.x - 5*p0.x + 4*p1.x - p2.x) * t² +
  (-p_-1.x + 3*p0.x - 3*p1.x + p2.x) * t³
)
```

### Custom Shapes
```javascript
// Define custom points (normalized -1 to 1)
const customShape = {
  name: 'My Ship',
  points: [
    { x: 0.8, y: 0 },     // Nose
    { x: -0.3, y: 0.5 },  // Left wing
    { x: -0.3, y: -0.5 }, // Right wing
  ],
  closed: true,
  type: 'CUSTOM',
  params: {}
};

// Validate and use
customShape.points = ShapeEditor.validateShape(customShape.points);
```

---

## API Reference

### Initialization
```javascript
// Initialize shape library (auto-called on load)
ShapeEditor.init();
```

### Generation Functions
```javascript
// Generate polygon
const triangle = ShapeEditor.generatePolygon(3, 0.8, 0);

// Generate star
const star = ShapeEditor.generateStar(5, 0.8, 0.4, 0);

// Generate ship
const ship = ShapeEditor.generateShipShape(1.0, 1.2, 0.5);

// Smooth curve
const curve = ShapeEditor.generateSmoothCurve(controlPoints, 16);
```

### Validation & Transform
```javascript
// Validate and fix shape
const validPoints = ShapeEditor.validateShape(points);

// Normalize to bounds
const normalized = ShapeEditor.normalizeShape(points, 1.0);

// Apply symmetry
const symmetrical = ShapeEditor.applySymmetry(points, 'HORIZONTAL');

// Transform (rotate + scale)
const transformed = ShapeEditor.transformShape(points, Math.PI/4, 1.5);
```

### Rendering
```javascript
// Render editor panel (call in game loop)
ShapeEditor.render(ctx, canvasWidth, canvasHeight);

// Draw preview (standalone)
ShapeEditor.drawPreview(ctx, shape, centerX, centerY, radius);
```

### Input Handling
```javascript
// Handle keyboard (call in keydown handler)
window.addEventListener('keydown', (e) => {
  ShapeEditor.handleKey(e);
});
```

### Export/Import
```javascript
// Export current shape as JSON
const json = ShapeEditor.export();
console.log(json);

// Import shape from JSON
const success = ShapeEditor.import(jsonString);
```

### Access State
```javascript
// Get current shape
const currentShape = ShapeEditor.getCurrentShape();

// Get all shapes
const allShapes = ShapeEditor.getShapes();

// Access editor state
const isOpen = ShapeEditor.state.isOpen;
const rotation = ShapeEditor.state.rotation;
const scale = ShapeEditor.state.scale;
```

---

## Integration with Game

### Step 1: Add Script to HTML
```html
<script src="shape-editor.js"></script>
```

### Step 2: Initialize in Game Loop
```javascript
// In your init function
ShapeEditor.init();

// In your render function
function render() {
  // ... draw game ...
  
  // Draw shape editor overlay
  ShapeEditor.render(ctx, canvas.width, canvas.height);
}

// In your input handler
window.addEventListener('keydown', (e) => {
  ShapeEditor.handleKey(e);
});
```

### Step 3: Use Player Ship Shape
```javascript
// Get current shape for player
const shipShape = ShapeEditor.getCurrentShape();

// Transform to game coordinates
const gamePoints = shipShape.points.map(p => ({
  x: player.x + p.x * shipSize,
  y: player.y + p.y * shipSize
}));

// Draw player ship
ctx.beginPath();
for (let i = 0; i < gamePoints.length; i++) {
  if (i === 0) ctx.moveTo(gamePoints[i].x, gamePoints[i].y);
  else ctx.lineTo(gamePoints[i].x, gamePoints[i].y);
}
ctx.closePath();
ctx.strokeStyle = playerColor;
ctx.stroke();
```

---

## Shape Data Format

### Shape Object Structure
```javascript
{
  name: "Ship Name",           // Display name
  points: [                    // Vertices (normalized -1 to 1)
    { x: 0.8, y: 0 },
    { x: -0.3, y: 0.5 },
    { x: -0.3, y: -0.5 }
  ],
  closed: true,                // Connect last to first point?
  type: "POLYGON",             // Type: POLYGON, STAR, SHIP, CURVE, CUSTOM
  params: {                    // Generation parameters
    sides: 3,
    radius: 0.8
  }
}
```

### Normalized Coordinates
All points are normalized to **-1 to 1** range:
- **(0, 0)** = Center
- **(1, 0)** = Right edge
- **(-1, 0)** = Left edge
- **(0, 1)** = Top edge
- **(0, -1)** = Bottom edge

**Conversion to Game Coordinates:**
```javascript
gameX = centerX + (normalizedX * size)
gameY = centerY + (normalizedY * size)
```

---

## Safety & Constraints

### What Can't Break

1. **No oversizing**: Shapes auto-normalize to max bounds
2. **No invalid geometries**: Less than 2 points → triangle
3. **No duplicates**: Points within 0.01 distance merged
4. **No performance issues**: Max 32 vertices enforced
5. **No edge cases**: All divisions protected by zero checks

### Constraint System

```javascript
// Size constraints (in shape-editor.js)
maxSize: 100,      // Maximum dimension
minSize: 10,       // Minimum dimension
maxPoints: 32,     // Maximum vertices

// Parameter constraints
sides: clamp(3, 32)           // Polygon sides
starPoints: clamp(3, 16)      // Star points
radius: clamp(0.1, 1.0)       // Normalized radius
scale: clamp(0.5, 2.0)        // Scale multiplier
```

---

## Performance

### Optimization Details
- **Generation**: O(n) where n = vertices
- **Validation**: O(n) single pass duplicate removal
- **Normalization**: O(n) single pass min/max + transform
- **Rendering**: O(n) canvas path drawing
- **Memory**: ~200 bytes per shape

### Best Practices
- Use presets when possible (already optimized)
- Keep vertex count under 16 for complex shapes
- Cache normalized shapes to avoid recomputation
- Update sliders only on user input (not every frame)

---

## Troubleshooting

### Issue: Shape looks distorted
**Solution**: Check if rotation/scale are at default values (0°, 1.0×)

### Issue: Sliders not responding
**Solution**: Ensure shape type matches slider controls (POLYGON, STAR, SHIP)

### Issue: Shape disappears
**Solution**: Validation may have simplified it - check points array length

### Issue: Can't open editor
**Solution**: Make sure `ShapeEditor.init()` was called before use

---

## Examples

### Example 1: Create Custom Fighter
```javascript
const fighter = {
  name: 'X-Fighter',
  points: [
    { x: 0.9, y: 0 },      // Nose
    { x: 0.2, y: 0.3 },    // Upper body
    { x: -0.1, y: 0.7 },   // Left wing
    { x: -0.5, y: 0.2 },   // Left engine
    { x: -0.5, y: -0.2 },  // Right engine
    { x: -0.1, y: -0.7 },  // Right wing
    { x: 0.2, y: -0.3 },   // Lower body
  ],
  closed: true,
  type: 'CUSTOM',
  params: {}
};

// Validate and use
fighter.points = ShapeEditor.validateShape(fighter.points);
```

### Example 2: Parametric Ship Builder
```javascript
function createCustomShip(wingWidth, noseShape, engineSize) {
  const ship = ShapeEditor.generateShipShape(
    wingWidth,    // 0.5-1.5
    noseShape,    // 0.5-1.5
    engineSize    // 0.3-0.8
  );
  
  // Apply transformations
  const rotated = ShapeEditor.transformShape(ship, Math.PI / 6, 1.2);
  
  // Ensure valid
  return ShapeEditor.validateShape(rotated);
}
```

### Example 3: Symmetrical Design
```javascript
// Create half-shape (right side)
const halfShip = [
  { x: 0.8, y: 0 },
  { x: 0, y: 0.5 },
  { x: -0.3, y: 0.3 },
];

// Mirror to create full shape
const fullShip = ShapeEditor.applySymmetry(halfShip, 'HORIZONTAL');
```

---

## Credits

**Shape Editor System** by NEO-VECTR Development Team  
**Mathematical Algorithms**: Parametric generation, Catmull-Rom splines  
**Validation Engine**: Auto-fix and normalization  
**UI Design**: Neon cyberpunk aesthetic  

---

## Version History

- **v1.0** - Initial release with polygon, star, and ship generation
- **v1.0** - Validation system and auto-normalization
- **v1.0** - Real-time preview and slider controls
- **v1.0** - Export/import functionality

---

**Press E to open the Shape Editor and start creating!**
