const IDENTITY = Object.freeze({ namespace: 'magic-history', version: 1, module: 'art' });
export function validHostOrigin(value) {
  try {
    const url = new URL(value);
    return url.origin === value && !url.username && !url.password &&
      (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)));
  } catch { return false; }
}
export function mountModuleBridge({window: win, document: doc, ResizeObserver: Observer}) {
  const hostOrigin = new URLSearchParams(win.location.search).get('hostOrigin');
  if (win.parent === win || !validHostOrigin(hostOrigin)) return () => {};
  let lastHeight = 0, timer, disposed = false;
  const height = () => {
    const workspace = doc.querySelector?.('.art-workspace');
    const bounds = workspace?.getBoundingClientRect();
    // scrollHeight includes the embed viewport floor and cannot report shrinkage.
    // The course's last in-flow element provides its actual document extent.
    const margin = workspace ? Number.parseFloat(win.getComputedStyle?.(workspace)?.marginBottom) || 0 : 0;
    const extent = bounds?.height > 0
      ? bounds.bottom + (win.scrollY || 0) + margin
      : Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight || 0);
    return Math.max(650, Math.min(10000, Math.ceil(extent)));
  };
  const send = type => {
    if (disposed) return;
    const nextHeight = height();
    if (type === 'resize' && Math.abs(nextHeight-lastHeight) < 2) return;
    lastHeight = nextHeight;
    win.parent.postMessage({...IDENTITY, type, height: nextHeight}, hostOrigin);
  };
  const receive = event => {
    const data = event.data;
    if (event.source !== win.parent || event.origin !== hostOrigin || !data ||
      data.namespace !== IDENTITY.namespace || data.version !== 1 || data.module !== 'art' || data.type !== 'init') return;
    send('ready');
  };
  const schedule = () => { win.clearTimeout(timer); timer = win.setTimeout(() => send('resize'), 100); };
  win.addEventListener('message', receive);
  win.addEventListener('resize', schedule);
  const observer = Observer ? new Observer(schedule) : null;
  observer?.observe(doc.documentElement);
  // Descendants can shrink without resizing a viewport-sized root element.
  for (const selector of ['.art-workspace', '#filterContainer']) {
    const target = doc.querySelector?.(selector);
    if (target) observer?.observe(target);
  }
  send('ready');
  return () => { disposed = true; observer?.disconnect(); win.clearTimeout(timer); win.removeEventListener('message', receive); win.removeEventListener('resize', schedule); };
}
if (typeof window !== 'undefined') mountModuleBridge({window, document, ResizeObserver: window.ResizeObserver});
