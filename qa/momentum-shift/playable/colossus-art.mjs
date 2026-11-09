/** Original Canvas art: a walking siege citadel spanning all three roads. */
export function drawColossus(c, boss, time, {reducedMotion = false} = {}) {
  const step = reducedMotion ? 0 : Math.sin(time * 3.4) * 5;
  c.save(); c.translate(boss.x, boss.y);
  c.fillStyle = '#1d211bc0'; c.beginPath(); c.ellipse(15, 25, 202, 211, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#f1b96c'; c.lineWidth = 3; c.setLineDash([12, 10]);
  c.beginPath(); c.arc(0, 0, 210, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
  // Eight driven legs make its enormous road-spanning footprint unmistakable.
  for (let i = 0; i < 4; i++) for (const side of [-1, 1]) {
    const y = -153 + i * 102, gait = (i % 2 ? step : -step) * side;
    c.strokeStyle = '#292b25'; c.lineWidth = 26; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(side * 90, y); c.lineTo(side * 171 + gait, y - 18); c.lineTo(side * 194 + gait, y + 18); c.stroke();
    c.strokeStyle = '#9c8058'; c.lineWidth = 13; c.stroke();
    c.fillStyle = '#c5ad7d'; c.fillRect(side * 194 + gait - 14, y + 9, 28, 20);
  }
  const plate = (x, y, w, h, fill) => {c.fillStyle = fill; c.strokeStyle = '#222921'; c.lineWidth = 7; c.fillRect(x, y, w, h); c.strokeRect(x, y, w, h);};
  plate(-119, -182, 238, 364, '#5b6250');
  plate(-144, -144, 288, 288, '#72705a');
  for (const y of [-160, -80, 0, 80, 160]) {
    c.strokeStyle = '#aa926b'; c.lineWidth = 8; c.beginPath(); c.moveTo(-118, y); c.lineTo(118, y); c.stroke();
  }
  // Four crenellated towers and a burning central furnace, not an enlarged troop.
  for (const x of [-97, 97]) for (const y of [-137, 137]) {
    plate(x - 30, y - 30, 60, 60, '#8f9279');
    for (let n = 0; n < 3; n++) plate(x - 34 + n * 26, y - 41, 18, 19, '#b0ac87');
    c.fillStyle = '#242f29'; c.fillRect(x - 8, y - 10, 16, 25);
  }
  c.fillStyle = '#252b25'; c.beginPath(); c.ellipse(-15, 0, 82, 97, 0, 0, Math.PI * 2); c.fill();
  const pulse = reducedMotion ? .8 : .65 + Math.sin(time * 4) * .15;
  c.fillStyle = `rgba(242,132,57,${pulse})`; c.beginPath(); c.ellipse(-17, 0, 65, 78, 0, 0, Math.PI * 2); c.fill();
  for (const y of [-58, -29, 0, 29, 58]) {c.fillStyle = '#473d2b'; c.fillRect(-82, y - 6, 125, 12);}
  c.fillStyle = '#d6bd87'; c.beginPath(); c.moveTo(-168, -58); c.lineTo(-219, 0); c.lineTo(-168, 58); c.lineTo(-126, 0); c.closePath(); c.fill();
  c.strokeStyle = '#302e24'; c.lineWidth = 7; c.stroke();
  if (boss.attack > 0 && !reducedMotion) {
    c.strokeStyle = '#ffd99a'; c.lineWidth = 9; c.beginPath(); c.arc(0, 0, 230, 0, Math.PI * 2); c.stroke();
  }
  c.fillStyle = '#18231fee'; c.fillRect(-180, -247, 360, 43);
  c.font = 'bold 23px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#ffe2ab'; c.fillText('THE LAST ENGINE', 0, -219);
  c.fillStyle = '#231f1b'; c.fillRect(-180, -201, 360, 14);
  c.fillStyle = '#e6a273'; c.fillRect(-178, -199, 356 * Math.max(0, boss.hp / boss.maxHp), 10);
  c.restore();
}
