window.requestAnimFrame = (function () {
  return (
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    function (callback) {
      window.setTimeout(callback, 1000 / 60);
    }
  );
})();

const heartImg = document.getElementById("heartImg");

var canvas = document.getElementById("canvas"),
  context = canvas.getContext("2d"),
  width = (canvas.width = window.innerWidth),
  height = (canvas.height = window.innerHeight),
  ball = {
    x: 0,
    y: height / 2,
  },
  point = {
    x: 0,
    y: ball.y,
  },
  current_point = 0;

var points = [
  { y: 0, x: 20 },
  { y: 0, x: 1 },
  { y: 3, x: 1 },
  { y: -10, x: 2 },
  { y: 10, x: 2 },
  { y: -12, x: 3 },
  { y: 35, x: 5 },
  { y: -25, x: 4 },
  { y: 14, x: 3 },
  { y: 5, x: 2 },
  { y: 0, x: 1 },
  { y: 0, x: 20 },
];

var xScale = 9.13; // wider
var yScale = 5.2; // taller

// Apply scaling to all points
points = points.map((p) => ({ x: p.x * xScale, y: p.y * yScale }));

function triggerHeartBeat(scale = 1.2, duration = 100) {
  heartImg.style.transform = `translate(-50%, -50%) scale(${scale})`;
  setTimeout(() => {
    heartImg.style.transform = `translate(-50%, -50%) scale(1)`;
  }, duration);
}

context.fillStyle = "rgba(255, 0, 0, 1)";
render();
function animateTo() {
  function dist(x1, x2, y1, y2) {
    var dx = x1 - x2,
      dy = y1 - y2;
    return {
      d: Math.sqrt(dx * dx + dy * dy),
      dx: dx,
      dy: dy,
    };
  }
  var dis = dist(
    ball.x,
    point.x + points[current_point].x,
    ball.y,
    point.y + points[current_point].y
  );
    // to make heartbeat faster
    if (points[current_point].y > 20) {
      // adjust threshold for peak
      triggerHeartBeat(1.2, 100); // scale up to 1.2 for 100ms
    }
  var speedMultiplier = 2;
  if (dis.d > 1) {
    var s = Math.abs(dis.dy) > 13 ? 2 * speedMultiplier : 1 * speedMultiplier;
    ball.x += -(dis.dx / dis.d) * s;
    ball.y += -(dis.dy / dis.d) * s;
  } else {
    ball.x = point.x + points[current_point].x;
    ball.y = point.y + points[current_point].y;
    point.x += points[current_point].x;
    current_point++;
    if (current_point >= points.length || ball.x > width) {
      current_point = 0;
      if (ball.x > width) {
        point.x = ball.x = 0;
        ball.y = point.y = height / 2;
      }
    }
  }
}
function render() {
  requestAnimFrame(render);
  animateTo();
  context.fillStyle = "rgba(0, 0, 0, .01)";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "rgba(255, 0, 0, 1)";
  context.beginPath();
  context.arc(ball.x, ball.y, 3, 0, 2 * Math.PI, true);
  context.closePath();
  context.fill();
}
