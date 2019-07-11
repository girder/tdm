export default class Label {
  constructor({
    x, y,
    text,
    font = '12px mono',
    color = 'white',
  } = {}) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.font = font;
    this.color = color;
  }

  draw(context) {
    const ctx = context;
    ctx.save();
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = this.color;
    ctx.font = this.font;
    // const tw = ctx.measureText(this.text).width;
    ctx.fillText(
      this.text,
      this.x,
      this.y,
    );
    ctx.restore();
  }
}
