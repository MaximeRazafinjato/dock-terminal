window.DockSpike = window.DockSpike || {};

DockSpike.createPane = function createPane(options) {
  const ACK_THRESHOLD = 256 * 1024;
  const { id, provider, container, onFocus } = options;
  const bridge = DockSpike.bridge;

  const element = document.createElement('section');
  element.className = 'pane';
  element.dataset.pane = id;
  element.innerHTML = `
    <div class="pane-header">
      <span class="pane-title"></span>
      <span class="pane-renderer"></span>
      <span class="pane-cwd"></span>
    </div>
    <div class="pane-stats"></div>
    <div class="pane-terminal"></div>`;
  container.appendChild(element);

  const title = element.querySelector('.pane-title');
  const rendererLabel = element.querySelector('.pane-renderer');
  const cwdLabel = element.querySelector('.pane-cwd');
  const statsLabel = element.querySelector('.pane-stats');
  const terminalHost = element.querySelector('.pane-terminal');

  const term = new Terminal({
    allowProposedApi: true,
    cursorBlink: true,
    fontFamily: DockSpike.TERMINAL_FONT_FAMILY,
    fontSize: 14,
    scrollback: 10000,
    theme: { background: '#0c0e12', foreground: '#d7dce3', cursor: '#4fb37a' }
  });
  const fit = new FitAddon.FitAddon();
  const unicode = new Unicode11Addon.Unicode11Addon();
  term.loadAddon(fit);
  term.loadAddon(unicode);
  term.loadAddon(new ClipboardAddon.ClipboardAddon());
  term.unicode.activeVersion = '11';
  term.open(terminalHost);

  let renderer = 'dom';
  let unackedChars = 0;
  let receivedChars = 0;
  let writtenChars = 0;
  let lastReceivedAt = 0;
  let lastWrittenAt = 0;
  let firstReceivedAt = 0;

  function useCanvas() {
    try {
      term.loadAddon(new CanvasAddon.CanvasAddon());
      return 'canvas';
    } catch (error) {
      DockSpike.status(`Repli canvas impossible (${error.message}), rendu DOM.`, 'warn');
      return 'dom';
    }
  }

  function selectRenderer() {
    try {
      const webgl = new WebglAddon.WebglAddon();
      webgl.onContextLoss(() => {
        webgl.dispose();
        renderer = useCanvas();
        rendererLabel.textContent = renderer;
        DockSpike.status(`Contexte WebGL perdu sur ${id}, repli ${renderer}.`, 'warn');
      });
      term.loadAddon(webgl);
      return 'webgl';
    } catch (error) {
      DockSpike.status(`WebGL indisponible (${error.message}), repli canvas.`, 'warn');
      return useCanvas();
    }
  }

  renderer = selectRenderer();
  rendererLabel.textContent = renderer;
  title.textContent = `${id} · ConPTY ${provider === 'embedded' ? 'embarquée' : 'Windows'}`;

  term.attachCustomKeyEventHandler((event) => DockSpike.keyboard.handle(event, id));
  term.onData((data) => {
    DockSpike.journal.logSent(id, data);
    if (DockSpike.journal.isVisible()) {
      bridge.send({ type: 'log', data: `${id} onData ${JSON.stringify(data)}` });
    }
    bridge.send({ type: 'input', pane: id, data });
  });
  term.onResize(({ cols, rows }) => bridge.send({ type: 'resize', pane: id, cols, rows }));
  terminalHost.addEventListener('mousedown', () => onFocus(id));
  element.querySelector('.pane-header').addEventListener('mousedown', () => onFocus(id));

  function write(data) {
    const now = performance.now();
    if (receivedChars === 0) {
      firstReceivedAt = now;
    }
    receivedChars += data.length;
    lastReceivedAt = now;
    unackedChars += data.length;
    term.write(data, () => {
      writtenChars += data.length;
      lastWrittenAt = performance.now();
      if (unackedChars >= ACK_THRESHOLD) {
        bridge.send({ type: 'ack', pane: id, chars: unackedChars });
        unackedChars = 0;
      }
    });
    if (unackedChars >= ACK_THRESHOLD * 4) {
      bridge.send({ type: 'ack', pane: id, chars: unackedChars });
      unackedChars = 0;
    }
  }

  function showStats(stats) {
    const megabytes = (value) => (value / 1024 / 1024).toFixed(2);
    const seconds = lastWrittenAt > firstReceivedAt ? (lastWrittenAt - firstReceivedAt) / 1000 : 0;
    const renderRate = seconds > 0 ? megabytes(writtenChars / seconds) : '0.00';
    statsLabel.textContent = `pty ${megabytes(stats.ptyBytes)} Mo (${megabytes(stats.ptyRate)} Mo/s) · pont ${megabytes(stats.bridgeChars)} Mc en ${stats.messages} msg (${megabytes(stats.bridgeRate)} Mc/s) · rendu ${megabytes(writtenChars)} Mc (${renderRate} Mc/s)${stats.sinkOnly ? ' · sans pont' : ''}`;
  }

  function resetStats() {
    receivedChars = 0;
    writtenChars = 0;
    firstReceivedAt = 0;
    lastWrittenAt = 0;
  }

  function setActive(active) {
    element.classList.toggle('active', active);
    if (active) {
      term.focus();
    }
  }

  function setCwd(path) {
    cwdLabel.textContent = path;
    cwdLabel.title = path;
  }

  function markExited(code) {
    element.classList.add('exited');
    term.write(`\r\n\x1b[31m[processus terminé, code ${code}]\x1b[0m\r\n`);
  }

  function spawn() {
    fit.fit();
    bridge.send({ type: 'create', pane: id, provider, cols: term.cols, rows: term.rows });
  }

  function copySelection() {
    if (term.hasSelection()) {
      navigator.clipboard.writeText(term.getSelection());
    }
  }

  function pasteClipboard() {
    navigator.clipboard.readText().then((text) => term.paste(text));
  }

  new ResizeObserver(() => fit.fit()).observe(terminalHost);

  return { id, provider, element, term, write, showStats, resetStats, setActive, setCwd, markExited, spawn, copySelection, pasteClipboard, fit: () => fit.fit(), lastReceivedAt: () => lastReceivedAt };
};
