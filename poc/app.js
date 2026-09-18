const KEY='dock-green-poc-v1';
const uid=()=>crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2);
const line=(text,type='')=>({text,type});
function pane(path='C:\\Projets\\terminal-studio',shell='PowerShell'){return {id:uid(),path,shell,lines:[line('Dock · Terminal de démonstration','success'),line('Tapez help pour voir les commandes simulées.','muted')],waiting:false}}
function tab(path,shell='PowerShell'){const p=pane(path,shell);return {id:uid(),name:shell,manual:false,active:p.id,tree:{pane:p}}}
function workspace(name,path){const t=tab(path);return {id:uid(),name,tabs:[t],active:t.id}}
function initial(){const w=workspace('Terminal Studio','C:\\Projets\\terminal-studio');w.tabs[0].name='Développement';w.tabs[0].manual=true;const p=w.tabs[0].tree.pane;p.waiting=true;p.lines=[line('❯ agent'),line('✓ Analyse des composants terminée','success'),line('✓ Structure des onglets préparée','success'),line(''),line('● Votre réponse est attendue','wait'),line('Conserver le workspace après la fermeture de son dernier onglet ?','wait'),line('Saisissez une réponse pour terminer cette simulation.','muted')];const server=pane(p.path);server.lines=[line('❯ npm run dev'),line('VITE ready in 284 ms','success'),line('Local: http://localhost:5173/','success'),line('Serveur fictif — aucun processus lancé.','muted')];w.tabs[0].tree={axis:'x',ratio:.6,a:w.tabs[0].tree,b:{pane:server}};w.tabs.push(tab(p.path,'Git Bash'));const personal=workspace('Perso','C:\\Users\\Utilisateur\\Documents');return {version:1,workspaces:[w,personal,workspace('API Boutique','C:\\Projets\\api-boutique')],active:w.id,closed:[],sidebar:292}}
const panes=n=>n.pane?[n.pane]:[...panes(n.a),...panes(n.b)];
function validate(s){if(!s||s.version!==1||!Array.isArray(s.workspaces)||!s.workspaces.length)throw Error('Format incorrect');let count=0;const tree=(n,depth=0)=>{if(++count>1000||depth>30||!n)throw Error('Disposition invalide');if(n.pane){const p=n.pane;if(typeof p.id!=='string'||typeof p.path!=='string'||typeof p.shell!=='string'||!Array.isArray(p.lines)||p.lines.length>2000||p.lines.some(l=>typeof l.text!=='string'||l.text.length>10000))throw Error('Pane invalide')}else{if(!['x','y'].includes(n.axis)||!Number.isFinite(n.ratio)||n.ratio<.1||n.ratio>.9)throw Error('Split invalide');tree(n.a,depth+1);tree(n.b,depth+1)}};for(const w of s.workspaces){if(typeof w.id!=='string'||typeof w.name!=='string'||!Array.isArray(w.tabs)||!w.tabs.length)throw Error('Workspace invalide');for(const t of w.tabs){if(typeof t.id!=='string'||typeof t.name!=='string')throw Error('Onglet invalide');tree(t.tree);if(!panes(t.tree).some(p=>p.id===t.active))throw Error('Pane actif invalide')}if(!w.tabs.some(t=>t.id===w.active))throw Error('Onglet actif invalide')}if(!s.workspaces.some(w=>w.id===s.active))throw Error('Workspace actif invalide');s.closed=[];s.sidebarCollapsed=s.sidebarCollapsed===true;s.sidebar=Math.max(220,Math.min(450,Number(s.sidebar)||292));return s}
let state,loadError=false;try{const raw=localStorage.getItem(KEY);state=raw?validate(JSON.parse(raw)):initial();if(raw)for(const w of state.workspaces)for(const t of w.tabs)for(const p of panes(t.tree)){p.waiting=false;p.lines.push(line('── Session restaurée · nouveau terminal simulé ──','restored'))}}catch{state=initial();loadError=true}
const ws=()=>state.workspaces.find(w=>w.id===state.active),current=()=>ws().tabs.find(t=>t.id===ws().active),activePane=()=>panes(current().tree).find(p=>p.id===current().active)||panes(current().tree)[0];
const $=s=>document.querySelector(s);let toastTimer,searchText='';
function notify(text){$('#toast').textContent=text;$('#toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.display='none',4200)}
function save(){for(const w of state.workspaces)for(const t of w.tabs)for(const p of panes(t.tree))p.lines=p.lines.slice(-500);try{localStorage.setItem(KEY,JSON.stringify(state));$('#save-state').textContent='✓ Disposition enregistrée'}catch{$('#save-state').textContent='Sauvegarde indisponible';notify('Le navigateur refuse la sauvegarde locale. La session reste utilisable.')}}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e}
function button(text,fn,cls=''){const b=el('button',cls,text);b.type='button';b.onclick=fn;return b}
function render(){syncSidebar();document.documentElement.style.setProperty('--sidebar',state.sidebar+'px');$('#workspace-title').textContent=ws().name;$('#tabs').replaceChildren();for(const t of ws().tabs){const box=el('div','tab'+(t.id===ws().active?' active':''));box.draggable=true;box.ondragstart=e=>e.dataTransfer.setData('text/plain',JSON.stringify({w:ws().id,t:t.id}));box.ondragover=e=>e.preventDefault();box.ondrop=e=>dropTab(e,ws().id,t.id);const b=button(t.name,()=>{if(ws().active!==t.id){ws().active=t.id;commit()}},'tab-name');b.setAttribute('role','tab');b.setAttribute('aria-selected',String(t.id===ws().active));b.ondblclick=()=>renameTab();box.append(b,button('×',()=>closeTab(t.id),'close'));$('#tabs').append(box)}$('#terminal-area').replaceChildren(renderTree(current().tree));renderWorkspaceList();const pending=state.workspaces.flatMap(w=>w.tabs.flatMap(t=>panes(t.tree).filter(p=>p.waiting).map(p=>({w,t,p}))));$('#attention').replaceChildren();if(pending.length){const box=el('div','attention');box.append(el('strong','','● Besoin de vous'),el('p','',pending.length+' terminal attend une réponse.'),button('Rejoindre le terminal ↗',()=>{const {w,t,p}=pending[0];state.active=w.id;w.active=t.id;t.active=p.id;commit();focusInput()}));$('#attention').append(box)}}
function renderWorkspaceList(){
  $('#workspaces').replaceChildren();
  for(const w of state.workspaces){
    const expanded=typeof w.expanded==='boolean'?w.expanded:w.id===state.active;
    const group=el('div','workspace-group'),row=el('div','workspace'+(w.id===state.active?' selected':''));
    const children=el('div','workspace-tabs');children.id='workspace-tabs-'+w.id;children.hidden=!expanded;
    const toggle=button(expanded?'▾':'▸',()=>{
      w.expanded=children.hidden;children.hidden=!w.expanded;
      toggle.textContent=w.expanded?'▾':'▸';toggle.setAttribute('aria-expanded',String(w.expanded));
      toggle.setAttribute('aria-label',(w.expanded?'Replier':'Afficher')+' les onglets de '+w.name);save();
    },'workspace-expand');
    toggle.setAttribute('aria-expanded',String(expanded));toggle.setAttribute('aria-controls',children.id);
    toggle.setAttribute('aria-label',(expanded?'Replier':'Afficher')+' les onglets de '+w.name);
    const select=button('',()=>{state.active=w.id;searchText='';commit()},'workspace-select');
    select.append(el('span','badge',w.tabs.length+' ong.'),el('strong','',w.name));
    const waiting=w.tabs.flatMap(t=>panes(t.tree)).filter(p=>p.waiting).length;
    if(waiting)select.append(el('span','waiting','● '+waiting+' réponse attendue'));
    row.append(toggle,select);row.ondragover=e=>e.preventDefault();row.ondrop=e=>dropTab(e,w.id);
    for(const t of w.tabs){
      const active=w.id===state.active&&t.id===w.active;
      const b=button('',()=>{state.active=w.id;w.active=t.id;w.expanded=true;searchText='';commit();focusInput()},'workspace-tab'+(active?' active':''));
      b.append(el('span','workspace-tab-icon','❯'),el('span','workspace-tab-name',t.name));
      b.title=t.name;if(active)b.setAttribute('aria-current','true');
      if(panes(t.tree).some(p=>p.waiting)){const dot=el('span','tab-attention','●');dot.title='Une réponse est attendue';b.append(dot);b.setAttribute('aria-label',t.name+' — une réponse est attendue')}
      b.draggable=true;b.ondragstart=e=>e.dataTransfer.setData('text/plain',JSON.stringify({w:w.id,t:t.id}));
      b.ondragover=e=>e.preventDefault();b.ondrop=e=>dropTab(e,w.id,t.id);children.append(b);
    }
    group.append(row,children);$('#workspaces').append(group);
  }
}
function syncSidebar(){
  document.body.dataset.panelStyle=['original','compact','tree','cards','minimal'].includes(state.panelStyle)?state.panelStyle:'tree';
  const collapsed=state.sidebarCollapsed===true;
  document.body.classList.toggle('sidebar-collapsed',collapsed);
  const toggle=$('#toggle-workspaces');
  toggle.setAttribute('aria-expanded',String(!collapsed));
  toggle.title=collapsed?'Afficher les workspaces':'Replier les workspaces';
  toggle.setAttribute('aria-label',toggle.title);
  toggle.textContent=collapsed?'◨':'◧';
}
function toggleSidebar(){
  state.sidebarCollapsed=!state.sidebarCollapsed;
  if(state.sidebarCollapsed&&($('#workspace-panel').contains(document.activeElement)||document.activeElement===$('#sidebar-resizer')))$('#toggle-workspaces').focus();
  syncSidebar();save();
}
function commit(){render();save()}
function focusInput(){$('.pane.active input')?.focus()}
function setPane(id){current().active=id;document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('active',p.dataset.id===id));save()}
function renderTree(n){if(n.pane){const p=n.pane,box=el('section','pane'+(p.id===current().active?' active':''));box.dataset.id=p.id;box.addEventListener('pointerdown',()=>{if(current().active!==p.id)setPane(p.id)});const head=el('div','pane-head');head.title=p.path;head.append(el('strong','','❯ '+p.shell+' · '+p.path),button('×',()=>closePane(p.id)));box.append(head);const out=el('div','terminal-output');for(const l of p.lines){const match=searchText&&l.text.toLowerCase().includes(searchText.toLowerCase());out.append(el('div','line '+(l.type||'')+(match?' match':''),l.text))}box.append(out);const f=el('form','terminal-input'),input=el('input');input.placeholder=p.waiting?'Votre réponse…':'Saisir une commande simulée…';input.setAttribute('aria-label','Commande '+p.shell);input.autocomplete='off';input.spellcheck=false;input.onfocus=()=>{if(current().active!==p.id)setPane(p.id)};f.append(el('span','','❯'),input);f.onsubmit=e=>{e.preventDefault();execute(p,input.value);input.value=''};box.append(f);requestAnimationFrame(()=>{if(searchText)out.querySelector('.match')?.scrollIntoView({block:'nearest'});else out.scrollTop=out.scrollHeight});return box}const root=el('div','split'+(n.axis==='y'?' vertical':'')),a=el('div','split-child'),b=el('div','split-child'),handle=el('div','splitter');a.style.flex=n.ratio;b.style.flex=1-n.ratio;a.append(renderTree(n.a));b.append(renderTree(n.b));handle.tabIndex=0;handle.setAttribute('role','separator');handle.setAttribute('aria-label','Redimensionner les panes');const resize=r=>{n.ratio=Math.max(.15,Math.min(.85,r));a.style.flex=n.ratio;b.style.flex=1-n.ratio};handle.onpointerdown=e=>{handle.setPointerCapture(e.pointerId);handle.onpointermove=e=>{const r=root.getBoundingClientRect();resize(n.axis==='x'?(e.clientX-r.left)/r.width:(e.clientY-r.top)/r.height)};handle.onpointerup=()=>{handle.onpointermove=null;save()}};handle.onkeydown=e=>{if(['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'].includes(e.key)){e.preventDefault();resize(n.ratio+(['ArrowLeft','ArrowUp'].includes(e.key)?-.05:.05));save()}};root.append(a,handle,b);return root}
function replaceNode(n,id,fn){if(n.pane)return n.pane.id===id?fn(n):n;n.a=replaceNode(n.a,id,fn);n.b=replaceNode(n.b,id,fn);return n}
function split(axis){const p=activePane(),fresh=pane(p.path,p.shell);current().tree=replaceNode(current().tree,p.id,n=>({axis,ratio:.5,a:n,b:{pane:fresh}}));current().active=fresh.id;commit();focusInput()}
function prune(n,id){if(n.pane)return n.pane.id===id?null:n;const a=prune(n.a,id),b=prune(n.b,id);return a&&b?{...n,a,b}:a||b}
function closePane(id){if(panes(current().tree).length===1)return closeTab(current().id);current().tree=prune(current().tree,id);if(current().active===id)current().active=panes(current().tree)[0].id;commit()}
function closeTab(id){const w=ws(),index=w.tabs.findIndex(t=>t.id===id);state.closed.push({workspace:w.id,tab:structuredClone(w.tabs[index])});state.closed=state.closed.slice(-10);w.tabs.splice(index,1);if(!w.tabs.length)w.tabs.push(tab('C:\\Users\\Utilisateur'));if(w.active===id)w.active=w.tabs[Math.min(index,w.tabs.length-1)].id;commit();notify('Onglet fermé. Restauration disponible dans le panneau droit.')}
function restoreTab(){const item=state.closed.pop();if(!item)return notify('Aucun onglet fermé à restaurer dans cette session.');const w=state.workspaces.find(w=>w.id===item.workspace)||ws();w.tabs.push(item.tab);w.active=item.tab.id;state.active=w.id;for(const p of panes(item.tab.tree)){p.waiting=false;p.lines.push(line('── Onglet rouvert · nouveau terminal simulé ──','restored'))}commit()}
function dropTab(e,targetId,beforeId){e.preventDefault();let data;try{data=JSON.parse(e.dataTransfer.getData('text/plain'))}catch{return}const source=state.workspaces.find(w=>w.id===data.w),target=state.workspaces.find(w=>w.id===targetId);if(!source||!target||data.t===beforeId)return;const index=source.tabs.findIndex(t=>t.id===data.t);if(index<0)return;const [t]=source.tabs.splice(index,1);if(!source.tabs.length&&source!==target)source.tabs.push(tab('C:\\Users\\Utilisateur'));if(source.active===t.id&&source.tabs.length)source.active=source.tabs[0].id;const dest=beforeId?target.tabs.findIndex(t=>t.id===beforeId):target.tabs.length;target.tabs.splice(dest<0?target.tabs.length:dest,0,t);target.active=t.id;state.active=target.id;commit()}
function modal(title){$('#modal-title').textContent=title;$('#modal-content').replaceChildren();$('#modal-form').onsubmit=e=>e.preventDefault();if(!$('#modal').open)$('#modal').showModal();return $('#modal-content')}
function field(parent,label,value,options){const l=el('label','field',label),i=el(options?'select':'input');if(options)for(const o of options){const option=el('option','',o);option.value=o;i.append(option)}i.value=value;l.append(i);parent.append(l);return i}
function edit(title,label,value,callback){const c=modal(title),input=field(c,label,value);input.required=true;const b=el('button','submit','Enregistrer');b.type='submit';c.append(b);$('#modal-form').onsubmit=e=>{e.preventDefault();if(!input.value.trim())return;$('#modal').close();callback(input.value.trim())};input.focus();input.select()}
function renameWorkspace(){
  const title=$('#workspace-title');
  if(title.querySelector('input'))return;
  const target=ws(),input=el('input','workspace-name-input');
  input.value=target.name;input.maxLength=100;input.setAttribute('aria-label','Nom du workspace');
  title.removeAttribute('role');title.tabIndex=-1;title.classList.add('editing');title.replaceChildren(input);
  let finished=false;
  function finish(cancel=false,restoreFocus=false){
    if(finished)return;finished=true;
    const name=input.value.trim();if(!cancel&&name)target.name=name;
    title.textContent=ws().name;title.classList.remove('editing');title.setAttribute('role','button');title.tabIndex=0;
    const selected=$('#workspaces .workspace.selected strong');if(selected)selected.textContent=ws().name;
    save();if(restoreFocus)title.focus();
  }
  input.onblur=()=>finish();
  input.onkeydown=e=>{e.stopPropagation();if(e.isComposing)return;if(e.key==='Enter'){e.preventDefault();finish(false,true)}else if(e.key==='Escape'){e.preventDefault();finish(true,true)}};
  input.focus();input.select();
}
$('#workspace-title').onclick=()=>renameWorkspace();
$('#workspace-title').onkeydown=e=>{if(e.target!==e.currentTarget)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();renameWorkspace()}};
function renameTab(){
  const target=current(),b=$('.tab.active .tab-name');if(!b)return;
  const input=el('input','tab-name-input');input.value=target.name;input.maxLength=100;input.setAttribute('aria-label','Nom de l’onglet');
  b.replaceWith(input);input.closest('.tab').draggable=false;let done=false;
  const finish=(cancel=false)=>{if(done)return;done=true;if(!cancel&&input.value.trim()){target.name=input.value.trim();target.manual=true}b.textContent=target.name;input.replaceWith(b);b.closest('.tab').draggable=true;renderWorkspaceList();save()};
  input.onblur=()=>finish();input.onkeydown=e=>{e.stopPropagation();if(e.isComposing)return;if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();finish(e.key==='Escape');b.focus()}};input.focus();input.select();
}
function openShellMenu(){
  document.querySelector('.shell-menu')?.remove();
  const anchor=$('[data-action="add-tab"]'),menu=el('div','shell-menu');
  menu.setAttribute('role','menu');menu.setAttribute('aria-label','Choisir le shell');anchor.setAttribute('aria-expanded','true');
  function close(restoreFocus=false){menu.remove();anchor.setAttribute('aria-expanded','false');document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',dismiss);document.removeEventListener('scroll',dismiss,true);if(restoreFocus)anchor.focus()}
  function outside(e){if(!menu.contains(e.target))close()}
  function dismiss(){close()}
  for(const shell of ['PowerShell','CMD','Git Bash']){const b=button(shell,()=>{close();newTab(shell)});b.setAttribute('role','menuitem');b.tabIndex=-1;menu.append(b)}
  document.body.append(menu);const rect=anchor.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(rect.left,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(rect.bottom+5,innerHeight-menu.offsetHeight-8))+'px';
  const items=[...menu.children];items[0].focus();
  menu.onkeydown=e=>{const i=items.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();e.stopPropagation();const next=e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;items[next].focus()}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true)}else if(e.key==='Tab')close(true)};
  menu.onfocusout=()=>queueMicrotask(()=>{if(menu.isConnected&&!menu.contains(document.activeElement))close()});
  document.addEventListener('pointerdown',outside);window.addEventListener('resize',dismiss);document.addEventListener('scroll',dismiss,true);
}
$('[data-action="add-tab"]').oncontextmenu=e=>{e.preventDefault();openShellMenu()};
$('[data-action="add-tab"]').onkeydown=e=>{if((e.shiftKey&&e.key==='F10')||e.key==='ContextMenu'){e.preventDefault();openShellMenu()}};
function newTab(shell='PowerShell'){const t=tab(activePane().path,shell);ws().tabs.push(t);ws().active=t.id;commit();focusInput()}
function closeInline(){const c=$('#inline-tools');c.hidden=true;c.replaceChildren()}
function inlineTools(title){const c=$('#inline-tools');c.replaceChildren();c.hidden=false;const head=el('div','inline-head');head.append(el('strong','',title),button('×',()=>{closeInline();focusInput()},'inline-close'));c.append(head);return c}
function findInline(){
  const c=inlineTools('Rechercher dans les terminaux'),input=el('input','inline-input'),count=el('span','help');input.placeholder='Texte à rechercher…';input.value=searchText;input.setAttribute('aria-label','Rechercher dans les terminaux');c.append(input,count);
  const update=()=>{searchText=input.value;let matches=0;document.querySelectorAll('.terminal-output .line').forEach(l=>{const hit=!!searchText&&l.textContent.toLowerCase().includes(searchText.toLowerCase());l.classList.toggle('match',hit);if(hit)matches++});count.textContent=matches+' résultat(s)';$('.line.match')?.scrollIntoView({block:'nearest'})};
  input.oninput=update;input.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();input.value='';update();closeInline();focusInput()}};update();input.focus();input.select();
}
function copyPathFallback(){const c=inlineTools('Copier le chemin'),input=el('input','inline-input');input.value=activePane().path;input.readOnly=true;input.setAttribute('aria-label','Chemin à copier');c.append(input);input.focus();input.select()}
function newWorkspace(name,path){const w=workspace(name,path);state.workspaces.push(w);state.active=w.id;commit()}
function projects(){listModal('Ouvrir un projet',['terminal-studio','api-boutique','site-personnel','scripts'].map(name=>({name:'C:\\Projets\\'+name,run:()=>newWorkspace(name,'C:\\Projets\\'+name)})),'Dossiers fictifs : le navigateur ne parcourt pas votre disque.')}
function listModal(title,items,hint=''){
  const isPalette=title==='Commandes & navigation';
  const c=isPalette?modal(title):inlineTools(title),input=el('input','palette-input'),results=el('div','results');
  const close=()=>isPalette?$('#modal').close():closeInline();
  input.placeholder='Rechercher…';input.setAttribute('aria-label','Rechercher');
  input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','true');input.setAttribute('aria-controls','palette-results');
  results.id='palette-results';results.setAttribute('role','listbox');results.setAttribute('aria-label','Résultats');
  c.append(input,results);if(hint)c.append(el('p','help',hint));
  let selected=0,filtered=[];
  const select=(index,scroll=true)=>{
    selected=filtered.length?(index+filtered.length)%filtered.length:-1;
    [...results.querySelectorAll('.result')].forEach((b,i)=>{b.classList.toggle('selected',i===selected);b.setAttribute('aria-selected',String(i===selected))});
    if(selected<0){input.removeAttribute('aria-activedescendant');return}
    const active=results.children[selected];input.setAttribute('aria-activedescendant',active.id);if(scroll)active.scrollIntoView({block:'nearest'});
  };
  const update=()=>{
    filtered=items.filter(i=>i.name.toLocaleLowerCase().includes(input.value.toLocaleLowerCase()));results.replaceChildren();
    filtered.forEach((item,index)=>{const b=button(item.name,()=>{close();item.run()},'result');b.id='palette-result-'+index;b.tabIndex=-1;b.setAttribute('role','option');b.onpointermove=()=>select(index,false);b.onpointerdown=e=>e.preventDefault();results.append(b)});
    if(!filtered.length)results.append(el('p','help','Aucun résultat.'));
    select(0);results.scrollTop=0;
  };
  input.oninput=update;
  input.onkeydown=e=>{
    if(e.isComposing)return;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();select(selected+(e.key==='ArrowDown'?1:-1))}
    else if(e.key==='Enter'){e.preventDefault();e.stopPropagation();if(selected>=0)results.children[selected]?.click()}
    else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}
  };
  update();input.focus();
}
function palette(){closeInline();listModal('Commandes & navigation',[...Object.entries(commandLabels).map(([key,name])=>({name,run:()=>actions[key]()})),...state.workspaces.map(w=>({name:'Workspace · '+w.name,run:()=>{state.active=w.id;commit()}})),...state.workspaces.flatMap(w=>w.tabs.map(t=>({name:'Onglet · '+w.name+' / '+t.name,run:()=>{state.active=w.id;w.active=t.id;commit()}})))])}
function execute(p,raw){const text=raw.trim();if(!text)return;p.lines.push(line('❯ '+text));if(p.waiting){p.waiting=false;p.lines.push(line('✓ Réponse reçue. Démonstration terminée.','success'));notify('Terminal Studio · tâche simulée terminée.')}else if(text==='help')p.lines.push(line('Commandes simulées : help, pwd, cd <dossier>, clear, echo <texte>, ls, dir, agent, git status.','muted'));else if(text==='pwd')p.lines.push(line(p.path));else if(/^cd\s+/.test(text)){let target=text.slice(3).trim().replace(/^"|"$/g,'').replaceAll('/','\\');if(target==='..')p.path=p.path.replace(/\\[^\\]+\\?$/,'')||'C:\\';else if(/^[a-z]:\\/i.test(target))p.path=target;else p.path=p.path.replace(/\\$/,'')+'\\'+target;p.lines.push(line('Dossier simulé : '+p.path,'muted'));if(!current().manual)current().name=p.path.split('\\').filter(Boolean).pop()||p.shell}else if(text==='clear'||text==='cls')p.lines=[];else if(text.startsWith('echo '))p.lines.push(line(text.slice(5)));else if(text==='ls'||text==='dir')p.lines.push(line('src/    docs/    package.json    README.md','success'));else if(text==='git status')p.lines.push(line('Démonstration : branche feat/workspaces, aucun dépôt réel consulté.','muted'));else if(text==='agent'){p.waiting=true;p.lines.push(line('● Agent fictif : quelle tâche souhaitez-vous préparer ?','wait'));notify(ws().name+' · une réponse est attendue.')}else p.lines.push(line('Commande non exécutée : ce terminal est simulé. Tapez help.','muted'));commit();focusInput()}
const commandLabels={'panel-style':'Changer le style du panneau',shells:'Choisir un shell pour un nouvel onglet','toggle-workspaces':'Afficher / replier les workspaces','add-workspace':'Créer un workspace','rename-workspace':'Renommer le workspace','add-tab':'Nouvel onglet','rename-tab':'Renommer l’onglet','restore-tab':'Rouvrir le dernier onglet fermé','split-x':'Split côte à côte','split-y':'Split haut / bas','projects':'Ouvrir un projet','find':'Rechercher dans le terminal','actions':'Actions sur le dossier','export':'Exporter la configuration','import':'Importer la configuration'};
const actions={palette,'panel-style':()=>listModal('Style du panneau',[['original','Actuel'],['compact','01 · Liste compacte'],['tree','02 · Arborescence'],['cards','03 · Cartes'],['minimal','04 · Sections minimalistes']].map(([value,name])=>({name,run:()=>{state.panelStyle=value;syncSidebar();save()}}))),shells:openShellMenu,'toggle-workspaces':toggleSidebar,'add-workspace':()=>{newWorkspace('Nouveau workspace',activePane().path);renameWorkspace()},'rename-workspace':renameWorkspace,'add-tab':newTab,'rename-tab':renameTab,'restore-tab':restoreTab,'split-x':()=>split('x'),'split-y':()=>split('y'),projects,find:findInline,actions:()=>listModal('Dossier du pane actif',[{name:'Copier le chemin',run:async()=>{try{await navigator.clipboard.writeText(activePane().path);notify('Chemin copié.')}catch{copyPathFallback()}}},{name:'Ouvrir un terminal dans ce dossier',run:newTab},{name:'Ouvrir dans l’éditeur',run:()=>notify('Nécessite la future application native : '+activePane().path)},{name:'Ouvrir dans l’explorateur',run:()=>notify('Nécessite la future application native : '+activePane().path)},{name:'Copier le nom de branche',run:()=>notify('Aucun dépôt Git réel connecté dans ce POC.')}],activePane().path),export:()=>{const config=structuredClone(state);config.closed=[];for(const w of config.workspaces)for(const t of w.tabs)for(const p of panes(t.tree)){p.lines=[];p.waiting=false}const a=el('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(config,null,2)],{type:'application/json'}));a.download='dock-configuration.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);notify('Configuration exportée sans le texte des terminaux.')},import:()=>$('#import-file').click(),'close-modal':()=>$('#modal').close()};
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>actions[b.dataset.action]?.());$('#import-file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>2_000_000)throw Error();const next=validate(JSON.parse(await f.text()));if(!confirm('Remplacer la disposition actuelle par cette configuration ?'))return;state=next;commit();notify('Configuration importée.')}catch{notify('Configuration invalide ou trop volumineuse. Aucun changement appliqué.')}finally{e.target.value=''}};
const h=$('#sidebar-resizer');h.onpointerdown=e=>{h.setPointerCapture(e.pointerId);h.onpointermove=e=>{state.sidebar=Math.max(220,Math.min(450,innerWidth-e.clientX));document.documentElement.style.setProperty('--sidebar',state.sidebar+'px')};h.onpointerup=()=>{h.onpointermove=null;save()}};h.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();state.sidebar=Math.max(220,Math.min(450,state.sidebar+(e.key==='ArrowLeft'?15:-15)));commit()}};
let leader=false,leaderTimer;function clearLeader(){leader=false;$('#leader-status').textContent='Leader : Ctrl + Espace'}document.addEventListener('keydown',e=>{if(e.ctrlKey&&!e.altKey&&e.key.toLowerCase()==='p'){e.preventDefault();palette();return}if($('#modal').open)return;if(e.ctrlKey&&e.code==='Space'){e.preventDefault();leader=true;$('#leader-status').textContent='Leader actif · T / V / H / P / F / flèches';clearTimeout(leaderTimer);leaderTimer=setTimeout(clearLeader,2500);return}if(e.key==='Escape'&&searchText){searchText='';render();return}if(!leader)return;e.preventDefault();clearLeader();const map={t:'add-tab',v:'split-x',h:'split-y',p:'palette',f:'projects',w:'add-workspace'};if(map[e.key.toLowerCase()])actions[map[e.key.toLowerCase()]]();else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){const all=panes(current().tree),i=all.findIndex(p=>p.id===current().active),step=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1;setPane(all[(i+step+all.length)%all.length].id);focusInput()}});
// Apply the chosen design once, including to previously saved demo sessions.
if(state.panelDesignVersion!==1){state.panelStyle='tree';state.panelDesignVersion=1}
const panelFromUrl=new URLSearchParams(location.search).get('panel');if(['compact','tree','cards','minimal','original'].includes(panelFromUrl)){state.panelStyle=panelFromUrl;history.replaceState(null,'',location.pathname)}
render();save();if(loadError)notify('La sauvegarde précédente était indisponible ou invalide. Une session de démonstration a été ouverte.');
delete commandLabels.find;delete actions.find;document.querySelector('[data-action="find"]')?.remove();
