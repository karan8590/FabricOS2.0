import confetti from 'canvas-confetti';

function shouldFire(key?: string) {
  if (!key) return true;
  if (sessionStorage.getItem(key)) return false;
  sessionStorage.setItem(key, 'true');
  return true;
}

// Big celebration — order delivered, invoice paid
export function celebrateBig(sessionKey?: string) {
  if (!shouldFire(sessionKey)) return;
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#4F46E5','#16A34A','#D97706','#DC2626','#7C3AED'] });
}

// Medium celebration — advance repaid, vendor paid
export function celebrateMedium(sessionKey?: string) {
  if (!shouldFire(sessionKey)) return;
  confetti({ particleCount: 60, spread: 55, origin: { y: 0.65 }, colors: ['#4F46E5','#16A34A','#7C3AED'] });
}

// Small celebration — first customer order, order ready
export function celebrateSmall(sessionKey?: string) {
  if (!shouldFire(sessionKey)) return;
  confetti({ particleCount: 35, spread: 45, origin: { y: 0.7 }, colors: ['#4F46E5','#16A34A'] });
}

// Milestone — 100th/500th order
export function celebrateMilestone(sessionKey?: string) {
  if (!shouldFire(sessionKey)) return;
  const duration = 2000;
  const end = Date.now() + duration;
  (function frame() {
    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#4F46E5','#16A34A','#D97706'] });
    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#4F46E5','#16A34A','#D97706'] });
    if (Date.now() < end) requestAnimationFrame(frame);
  }());
}
