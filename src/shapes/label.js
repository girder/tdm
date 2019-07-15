export default class Label {
  constructor({
    x, y,
    text,
    fontSize = 12,
    fontFamily = 'mono',
    color = 'white',
  } = {}) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.fontSize = fontSize;
    this.fontFamily = fontFamily;
    this.color = color;
  }

  draw(context) {
    const ctx = context;
    ctx.save();
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = this.color;
    ctx.font = `${this.fontSize}px ${this.fontFamily}`;
    const tw = ctx.measureText(this.text).width;
    ctx.fillText(
      this.text,
      this.x,
      this.y,
    );
    ctx.restore();
  }

  intersect(x2, y2) {
    return false;
  }
}
