export default class Line {
  constructor({
    path,
    color = 'red',
    width = 2,
    opacity = 0.7,
  } = {}) {
    Object.assign(this, { path, color, width, opacity });
  }

  draw(context) {
    const ctx = context;
    ctx.save();
    ctx.lineWidth = this.width;
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = this.opacity;
    ctx.beginPath();
    for (let i = 0; i < this.path.length - 1; i += 1) {
      const current = this.path[i];
      const next = this.path[i + 1];
      ctx.moveTo(current[0], current[1]);
      ctx.lineTo(next[0], next[1]);
    }
    ctx.stroke();
    ctx.restore();
  }

  intersect(x2, y2) {
    const { x, y, width, height } = this;
    // TODO
  }

  hover() {
    // TODO
  }
}
