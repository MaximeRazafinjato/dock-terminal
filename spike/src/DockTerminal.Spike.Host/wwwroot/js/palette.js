window.DockSpike = window.DockSpike || {};

DockSpike.palette = (function () {
  const panel = document.getElementById('palette');
  const input = document.getElementById('palette-input');
  const list = document.getElementById('palette-list');
  let commands = [];
  let visible = [];
  let selected = 0;
  let onClose = null;

  function setCommands(items) {
    commands = items;
  }

  function render() {
    const filter = input.value.trim().toLowerCase();
    visible = commands.filter((command) => command.label.toLowerCase().includes(filter));
    selected = Math.min(selected, Math.max(visible.length - 1, 0));
    list.innerHTML = '';
    visible.forEach((command, index) => {
      const item = document.createElement('li');
      item.textContent = command.label;
      if (command.shortcut) {
        const shortcut = document.createElement('span');
        shortcut.className = 'shortcut';
        shortcut.textContent = command.shortcut;
        item.appendChild(shortcut);
      }
      item.classList.toggle('selected', index === selected);
      item.addEventListener('mousedown', (event) => {
        event.preventDefault();
        execute(command);
      });
      list.appendChild(item);
    });
  }

  function open(closeCallback) {
    onClose = closeCallback;
    selected = 0;
    input.value = '';
    panel.hidden = false;
    render();
    input.focus();
  }

  function close() {
    panel.hidden = true;
    if (onClose) {
      onClose();
    }
  }

  function execute(command) {
    close();
    command.run();
  }

  function handleKey(event) {
    if (event.key === 'Escape') {
      close();
    } else if (event.key === 'ArrowDown') {
      selected = Math.min(selected + 1, visible.length - 1);
      render();
    } else if (event.key === 'ArrowUp') {
      selected = Math.max(selected - 1, 0);
      render();
    } else if (event.key === 'Enter' && visible[selected]) {
      execute(visible[selected]);
    } else {
      return;
    }
    event.preventDefault();
  }

  input.addEventListener('keydown', handleKey);
  input.addEventListener('input', render);
  input.addEventListener('blur', () => {
    if (!panel.hidden) {
      close();
    }
  });

  return { setCommands, open, close, isOpen: () => !panel.hidden };
})();
