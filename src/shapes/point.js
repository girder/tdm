import SVG from 'svg.js';

export default class Point {
  constructor({
    x, y,
    color = 'red',
    radius = 4,
    width = 1,
    outlineColor = 'black',
    opacity = 0.7,
  } = {}) {
    Object.assign(this, { x, y, color, radius, width, outlineColor, opacity });
  }

  draw(context) {
    const ctx = context;
    ctx.save();
    ctx.lineWidth = this.width;
    ctx.globalAlpha = this.opacity;
    ctx.strokeStyle = this.outlineColor;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(
      this.x,
      this.y,
      this.radius,
      0, 2 * Math.PI,
    );
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }

  intersect(x2, y2) {
    const { x, y, radius } = this;
    // cheap and lazy intersection.
    if (x - radius < x2
      && (x2 < x + radius)
      && y - radius < y2
      && y2 < y + radius) {
      return true;
    }
    return false;
  }
}
