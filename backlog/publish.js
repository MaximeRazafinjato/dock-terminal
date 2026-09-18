// Publish the reviewed backlog through the authenticated GitHub CLI.
// Idempotent by the stable [Fxx]/[Dxx] prefix, including closed issues.
const fs=require('fs');
const {spawnSync}=require('child_process');
const repo='MaximeRazafinjato/dock-terminal';
function gh(args){const r=spawnSync('gh',['--repo',repo,...args],{encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr||r.stdout);return r.stdout.trim()}
const tasks=JSON.parse(fs.readFileSync('backlog/issues.json','utf8'));
const existing=JSON.parse(gh(['issue','list','--state','all','--limit','200','--json','number,title,url']));
const published=[];
for(const task of tasks){
  let issue=existing.find(i=>i.title.startsWith(`[${task.id}]`));
  if(!issue){const url=gh(['issue','create','--title',task.title,'--body-file',`backlog/${task.id}.md`,'--label',task.id==='D01'?'clarification':'fonctionnel']);issue={url,number:Number(url.split('/').pop()),title:task.title}}
  published.push({id:task.id,...issue});
  fs.writeFileSync('backlog/published.json',JSON.stringify(published,null,2)+'\n');
  console.log(`${task.id}: ${issue.url}`);
}
for(const task of tasks){
  const issue=published.find(i=>i.id===task.id);
  let body=task.body;
  if(task.dependencies.length)body=body.replace(task.dependencies.join(', '),task.dependencies.map(id=>`- ${id} : #${published.find(i=>i.id===id).number}`).join('\n'));
  fs.writeFileSync(`backlog/${task.id}.md`,body);
  gh(['issue','edit',String(issue.number),'--body-file',`backlog/${task.id}.md`]);
}
fs.writeFileSync('BACKLOG.md','# Backlog fonctionnel\n\n22 issues ouvertes à la création : 21 fonctionnalités et une clarification. Aucune priorité ni échéance. Les dépendances sont fonctionnelles, pas un planning.\n\n| ID | Issue | Dépendances |\n| --- | --- | --- |\n'+tasks.map(t=>{const p=published.find(i=>i.id===t.id);return `| ${t.id} | [${t.title}](${p.url}) | ${t.dependencies.map(id=>{const d=published.find(i=>i.id===id);return `[${id}](${d.url})`}).join(', ')||'—'} |`}).join('\n')+'\n');
console.log('Issue bodies and backlog links synchronized.');
