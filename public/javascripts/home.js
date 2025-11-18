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
const slogan = document.getElementById("slogan");
const text =
  "Measure your heart beat accurately and effectively now, uncompromised health";
slogan.textContent = "";
let charIndex = 0;

function typeSlogan() {
  if (charIndex < text.length) {
    slogan.textContent += text.charAt(charIndex);
    charIndex++;
    setTimeout(typeSlogan, 100); // typing speed (lower = faster)
  } else {
    // Optional: make it loop (delete and retype)
    setTimeout(() => {
      slogan.textContent = "";
      charIndex = 0;
      typeSlogan();
    }, 2000); // wait 2s after finishing before restarting
  }
}

typeSlogan();

// updateSlogan();

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

function triggerHeartBeat(scale = 1.2, duration = 200) {
  heartImg.style.transition = `transform ${duration * 2}ms ease-in-out`;
  heartImg.style.transform = `translate(-50%, -50%) scale(${scale})`;
  setTimeout(() => {
    heartImg.style.transition = `transform ${duration / 2}ms ease-in`;
    heartImg.style.transform = `translate(-50%, -50%) scale(1)`;
  }, duration);
}

function startDoubleHeartBeat() {
  function loopHeartBeat() {
    // First beat
    triggerHeartBeat();
    // Second beat shortly after
    setTimeout(() => {
      triggerHeartBeat();
    }, 300);
    // Repeat every 1.5 seconds
    setTimeout(loopHeartBeat, 2500);
  }

  loopHeartBeat();
}

// Start once everything is ready
render();
startDoubleHeartBeat();

context.fillStyle = "rgba(255, 0, 0, 1)";
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
