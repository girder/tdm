export default class Rectangle {
  constructor({
    x, y,
    width, height,
    color = null,
    borderWidth = 1,
    borderColor = 'red',
    opacity = 0.7,
  } = {}) {
    Object.assign(this, { x, y, width, height, color, borderWidth, borderColor, opacity });
  }

  draw(context) {
    const ctx = context;
    ctx.save();
    ctx.globalAlpha = this.opacity;
    if (this.borderWidth > 0) {
      ctx.lineWidth = this.borderWidth;
      ctx.strokeStyle = this.borderColor;
      ctx.beginPath();
      ctx.rect(this.x, this.y, this.width, this.height);
      ctx.stroke();
    }
    if (this.color) {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    ctx.restore();
  }

  intersect(x2, y3) {
    const { x, y, width, height } = this;
    // TODO
  }

  hover() {
    // TODO
  }
}
