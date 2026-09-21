window.DockSpike = window.DockSpike || {};

DockSpike.keyboard = (function () {
  const LEADER_TIMEOUT_MS = 5000;
  const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'AltGraph', 'Meta']);
  const indicator = document.getElementById('leader');
  const actions = {};
  let leaderTimer = null;
  let leaderActive = false;

  function setActions(map) {
    Object.assign(actions, map);
  }

  function enterLeader() {
    leaderActive = true;
    indicator.hidden = false;
    clearTimeout(leaderTimer);
    leaderTimer = setTimeout(exitLeader, LEADER_TIMEOUT_MS);
  }

  function exitLeader() {
    leaderActive = false;
    indicator.hidden = true;
    clearTimeout(leaderTimer);
  }

  function runLeaderCommand(event, paneId) {
    exitLeader();
    const commands = {
      ArrowLeft: 'focusLeft',
      ArrowRight: 'focusRight',
      h: 'focusLeft',
      l: 'focusRight',
      o: 'focusOther',
      j: 'toggleJournal',
      c: 'restartPane',
      x: 'closePane',
      Escape: 'cancel'
    };
    const action = commands[event.key];
    if (action && actions[action]) {
      actions[action](paneId);
    }
  }

  function keyIs(event, letter) {
    return event.key.toLowerCase() === letter || event.code === `Key${letter.toUpperCase()}`;
  }

  function isLeaderChord(event) {
    return event.ctrlKey && !event.altKey && !event.shiftKey && (event.key === ' ' || event.code === 'Space');
  }

  function isPalette(event) {
    return event.ctrlKey && !event.altKey && !event.shiftKey && keyIs(event, 'p');
  }

  function isCloseWindow(event) {
    return event.altKey && event.key === 'F4';
  }

  function isCopy(event) {
    return event.ctrlKey && event.shiftKey && keyIs(event, 'c');
  }

  function isPaste(event) {
    return event.ctrlKey && event.shiftKey && keyIs(event, 'v');
  }

  function handle(event, paneId) {
    DockSpike.journal.logKey(paneId, event);
    const decision = decide(event, paneId);
    if (!decision) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (DockSpike.journal.isVisible()) {
      DockSpike.bridge.send({ type: 'log', data: `${paneId} ${event.type} key=${event.key} code=${event.code} ctrl=${event.ctrlKey} alt=${event.altKey} shift=${event.shiftKey} composing=${event.isComposing} → ${decision ? 'xterm' : 'intercepté'}` });
    }
    return decision;
  }

  function decide(event, paneId) {
    if (event.type !== 'keydown') {
      return !(isLeaderChord(event) || isPalette(event) || isCloseWindow(event) || isCopy(event) || isPaste(event));
    }
    if (isCloseWindow(event)) {
      actions.closeWindow();
      return false;
    }
    if (leaderActive) {
      if (!MODIFIER_KEYS.has(event.key)) {
        runLeaderCommand(event, paneId);
      }
      return false;
    }
    if (isLeaderChord(event)) {
      enterLeader();
      return false;
    }
    if (isPalette(event)) {
      actions.openPalette(paneId);
      return false;
    }
    if (isCopy(event)) {
      actions.copySelection(paneId);
      return false;
    }
    if (isPaste(event)) {
      actions.pasteClipboard(paneId);
      return false;
    }
    return true;
  }

  return { handle, setActions, exitLeader };
})();
