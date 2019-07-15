export default class Marker {
  constructor({
    x, y,
    width, height,
    color = 'red',
    borderWidth = 1,
    borderColor = 'black',
    opacity = 0.7,
  } = {}) {
    Object.assign(this, { x, y, width, height, color, borderWidth, borderColor, opacity });
  }

  draw(context) {
    const ctx = context;
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + (this.width / 2), this.y - this.height);
    ctx.lineTo(this.x, this.y - (this.height * 0.8));
    ctx.lineTo(this.x - (this.width / 2), this.y - this.height);
    ctx.closePath();
    if (this.borderWidth > 0) {
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = this.borderWidth;
      ctx.stroke();
    }
    if (this.color) {
      ctx.fillStyle = this.color;
      ctx.fill();
    }
    ctx.restore();
  }

  intersect(x2, y2) {
    const { x, y, width, height } = this;
    return (Math.abs(x2 - x) < (width / 2)) && (Math.abs(y2 - (y - (height / 2))) < height);
  }
}
