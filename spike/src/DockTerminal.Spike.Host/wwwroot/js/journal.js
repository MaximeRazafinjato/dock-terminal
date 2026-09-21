window.DockSpike = window.DockSpike || {};

DockSpike.journal = (function () {
  const MAX_ENTRIES = 60;
  const panel = document.getElementById('journal');
  const list = document.getElementById('journal-list');
  let sequence = 0;

  function describeKey(event) {
    const modifiers = [
      event.ctrlKey ? 'Ctrl' : '',
      event.altKey ? 'Alt' : '',
      event.shiftKey ? 'Maj' : '',
      event.metaKey ? 'Win' : '',
      event.getModifierState && event.getModifierState('AltGraph') ? 'AltGr' : ''
    ].filter(Boolean).join('+');
    return `${event.type} key=${JSON.stringify(event.key)} code=${event.code}${modifiers ? ` [${modifiers}]` : ''}${event.isComposing ? ' (composition)' : ''}`;
  }

  function append(text, className) {
    sequence += 1;
    const item = document.createElement('li');
    item.textContent = `${String(sequence).padStart(4, '0')} ${text}`;
    if (className) {
      item.className = className;
    }
    list.appendChild(item);
    while (list.children.length > MAX_ENTRIES) {
      list.removeChild(list.firstChild);
    }
    panel.scrollTop = panel.scrollHeight;
  }

  function logKey(paneId, event) {
    if (panel.hidden || event.type === 'keyup') {
      return;
    }
    append(`${paneId} ${describeKey(event)}`);
  }

  function logSent(paneId, data) {
    if (panel.hidden) {
      return;
    }
    const bytes = Array.from(new TextEncoder().encode(data)).map((value) => value.toString(16).padStart(2, '0')).join(' ');
    append(`${paneId} → shell ${JSON.stringify(data)} [${bytes}]`, 'sent');
  }

  function toggle() {
    panel.hidden = !panel.hidden;
    return !panel.hidden;
  }

  return { logKey, logSent, toggle, isVisible: () => !panel.hidden };
})();
