window.DockSpike = window.DockSpike || {};

DockSpike.bridge = (function () {
  const handlers = new Map();
  const webview = window.chrome && window.chrome.webview;

  function send(message) {
    if (webview) {
      webview.postMessage(message);
    }
  }

  function on(type, handler) {
    if (!handlers.has(type)) {
      handlers.set(type, []);
    }
    handlers.get(type).push(handler);
  }

  function dispatch(message) {
    const list = handlers.get(message.type) || [];
    list.forEach((handler) => handler(message));
  }

  if (webview) {
    webview.addEventListener('message', (event) => dispatch(event.data));
  }

  return { send, on, available: Boolean(webview) };
})();
