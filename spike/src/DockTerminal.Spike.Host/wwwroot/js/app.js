(function () {
  const bridge = DockSpike.bridge;
  const container = document.getElementById('panes');
  const statusLabel = document.getElementById('status');
  const helloLabel = document.getElementById('hello');
  const PANE_IDS = ['p1', 'p2'];
  const panes = new Map();
  let activePaneId = PANE_IDS[0];
  let embeddedAvailable = false;

  DockSpike.status = function status(text, level) {
    statusLabel.textContent = text;
    statusLabel.className = level || '';
  };

  function pane(id) {
    return panes.get(id);
  }

  function activePane() {
    return pane(activePaneId);
  }

  function focusPane(id) {
    if (!panes.has(id)) {
      return;
    }
    activePaneId = id;
    panes.forEach((item) => item.setActive(item.id === id));
  }

  function otherPaneId() {
    return activePaneId === PANE_IDS[0] ? PANE_IDS[1] : PANE_IDS[0];
  }

  function createPane(id, provider) {
    const existing = pane(id);
    if (existing) {
      bridge.send({ type: 'close', pane: id });
      existing.element.remove();
    }
    const created = DockSpike.createPane({ id, provider, container, onFocus: focusPane });
    panes.set(id, created);
    if (id === PANE_IDS[0] && pane(PANE_IDS[1])) {
      container.insertBefore(created.element, pane(PANE_IDS[1]).element);
    }
    created.spawn();
    focusPane(id);
    return created;
  }

  function runBench(blocks, sinkOnly) {
    const target = activePane();
    target.resetStats();
    bridge.send({ type: 'sinkOnly', pane: target.id, enabled: sinkOnly });
    bridge.send({ type: 'bench', pane: target.id, blocks });
    DockSpike.status(`Bench ${blocks} blocs (~${(blocks * 81 / 1024).toFixed(1)} Mo) sur ${target.id}${sinkOnly ? ', sans pont' : ''} ; ouvrir aussi un bench sur l'autre pane pour le test à deux panes.`);
  }

  function paletteCommands() {
    const commands = [
      { label: 'Basculer vers l’autre pane', shortcut: 'Leader o', run: () => focusPane(otherPaneId()) },
      { label: 'Relancer le pane actif (ConPTY Windows)', shortcut: 'Leader c', run: () => createPane(activePaneId, 'windows') },
      { label: 'Fermer le pane actif', shortcut: 'Leader x', run: () => closePane(activePaneId) },
      { label: 'Afficher / masquer le journal de frappe', shortcut: 'Leader j', run: toggleJournal },
      { label: 'Bench 5 Mo via le pont PostWebMessage', run: () => runBench(64, false) },
      { label: 'Bench 20 Mo via le pont PostWebMessage', run: () => runBench(256, false) },
      { label: 'Bench 20 Mo lecture ConPTY seule (sans pont)', run: () => runBench(256, true) },
      { label: 'Réactiver le pont sur le pane actif', run: () => bridge.send({ type: 'sinkOnly', pane: activePaneId, enabled: false }) },
      { label: 'Lister les processus du Job Object du pane actif', run: () => bridge.send({ type: 'jobProcesses', pane: activePaneId }) },
      { label: 'Fermer la fenêtre', shortcut: 'Alt + F4', run: () => bridge.send({ type: 'closeWindow' }) }
    ];
    if (embeddedAvailable) {
      commands.splice(2, 0, { label: 'Relancer le pane actif (conpty.dll embarquée OpenConsole)', run: () => createPane(activePaneId, 'embedded') });
    }
    return commands;
  }

  function closePane(id) {
    const target = pane(id);
    if (!target) {
      return;
    }
    bridge.send({ type: 'close', pane: id });
    target.markExited('fermé');
  }

  function toggleJournal() {
    const shown = DockSpike.journal.toggle();
    panes.forEach((item) => item.fit());
    DockSpike.status(shown ? 'Journal de frappe affiché : touches et octets envoyés sont listés ici et dans %TEMP%\dockspike-web.log.' : 'Journal de frappe masqué.');
  }

  DockSpike.keyboard.setActions({
    focusLeft: () => focusPane(PANE_IDS[0]),
    focusRight: () => focusPane(PANE_IDS[1]),
    focusOther: () => focusPane(otherPaneId()),
    toggleJournal,
    restartPane: (id) => createPane(id, pane(id).provider),
    closePane,
    cancel: () => {},
    openPalette: () => {
      DockSpike.palette.setCommands(paletteCommands());
      DockSpike.palette.open(() => focusPane(activePaneId));
    },
    copySelection: (id) => pane(id).copySelection(),
    pasteClipboard: (id) => pane(id).pasteClipboard(),
    closeWindow: () => bridge.send({ type: 'closeWindow' })
  });

  bridge.on('hello', (message) => {
    embeddedAvailable = message.embeddedAvailable;
    helloLabel.textContent = `Windows ${message.os} · .NET ${message.runtime} · WebView2 ${message.webview}${embeddedAvailable ? ' · conpty.dll disponible' : ''}`;
    PANE_IDS.forEach((id) => createPane(id, 'windows'));
    DockSpike.status('Deux panes PowerShell 5.1 lancés. Ctrl + P ouvre la palette.');
  });
  bridge.on('created', (message) => DockSpike.status(`${message.pane} démarré (PID ${message.pid}, ConPTY ${message.provider}).`));
  bridge.on('output', (message) => pane(message.pane) && pane(message.pane).write(message.data));
  bridge.on('cwd', (message) => pane(message.pane) && pane(message.pane).setCwd(message.path));
  bridge.on('exit', (message) => pane(message.pane) && pane(message.pane).markExited(message.code));
  bridge.on('stats', (message) => pane(message.pane) && pane(message.pane).showStats(message));
  bridge.on('jobProcesses', (message) => DockSpike.status(`Job Object de ${message.pane} : PID ${message.pids.join(', ')}`));
  bridge.on('error', (message) => DockSpike.status(`Erreur hôte${message.pane ? ` (${message.pane})` : ''} : ${message.message}`, 'error'));

  if (!bridge.available) {
    DockSpike.status('Cette page doit être ouverte dans l’hôte WebView2 : aucun pont détecté.', 'error');
    return;
  }
  bridge.send({ type: 'ready' });
})();
