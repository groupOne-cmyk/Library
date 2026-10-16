// Shared code for every page: helpers, saved data, header, book cards, book details buttons
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// puts an invisible line-break point inside any word longer than 30 characters, so long unbroken text wraps instead of widening the page
const softBreak=s=>String(s??'').replace(/(\S{30})(?=\S)/gu,'$1\u200b');
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{toast('Storage is full. Use fewer or smaller images.');return false}};
function toast(t){const e=$('#toast');if(!e)return;e.textContent=t;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,2200)}
const TYPES={text:'Book',manga:'Manga',manhwa:'Manhwa',comic:'Comic'};
const PAGE=document.body.dataset.page;

const LOAN_MS=7*24*60*60*1000;   // a loan lasts one week

// ---- saved data (localStorage)
// books = library/books.json (saved by the admin page through GitHub) + optional hand-written entries in library/books.js
let books=[];
const EXTRA=typeof LIBRARY!=='undefined'?LIBRARY:[];
let users=load('users',null)||[{username:'admin',password:'admin123',role:'admin',list:[],loans:[],waits:[],progress:{}}];
users.forEach(u=>{u.progress=u.progress||{};u.due=u.due||{};u.loans.forEach(id=>{if(!u.due[id])u.due[id]=Date.now()+LOAN_MS})});   // due = when each loan must be returned
const current=load('currentUser',null);
const saveUsers=()=>save('users',users);
const me=()=>users.find(u=>u.username===current)||null;
const findBook=id=>books.find(b=>b.id==id);
const freeCopies=b=>b.copies-users.filter(u=>u.loans.includes(b.id)).length;
const chaptersOf=b=>b.chapters||[];
const pagesOf=c=>c.pages||Array.from({length:c.pageCount||0},(_,i)=>`${c.folder}/${String(i+1).padStart(c.pad||3,'0')}.${c.ext||'webp'}`);
const hue=s=>[...s].reduce((a,c)=>a+c.charCodeAt(0),0)%360;
const coverStyle=b=>`linear-gradient(160deg,hsl(${hue(b.title)} 45% 36%),hsl(${(hue(b.title)+40)%360} 50% 22%))`;
function returnBook(u,id,silent){
  u.loans=u.loans.filter(i=>i!==id);delete u.due[id];
  const next=users.find(x=>x.waits.includes(id));            // first person waiting gets the copy, with a fresh week
  if(next){next.waits=next.waits.filter(i=>i!==id);next.loans.push(id);next.due[id]=Date.now()+LOAN_MS}
  if(!silent)toast('Returned');
}
// a book can be read when a copy is free, or when this user has it borrowed
const canRead=(b,u)=>freeCopies(b)>0||!!u?.loans.includes(b.id);
function fmtLeft(due){
  const s=Math.max(0,Math.floor((due-Date.now())/1000));
  return `${Math.floor(s/86400)}d ${Math.floor(s%86400/3600)}h ${Math.floor(s%3600/60)}m ${s%60}s`;
}
// loans that ran out of time are returned automatically
function expireLoans(){
  let n=0;
  users.forEach(u=>u.loans.filter(id=>u.due[id]<=Date.now()).forEach(id=>{returnBook(u,id,true);n++}));
  if(n)saveUsers();
  return n;
}

// ---- page guards and header
if((PAGE==='my-library'&&!me())||(PAGE==='admin'&&me()?.role!=='admin'))location.replace('login.html');
(function(){
  const u=me(),btn=$('#auth-btn');
  $$('[data-auth="user"]').forEach(a=>a.hidden=!u);
  $$('[data-auth="admin"]').forEach(a=>a.hidden=u?.role!=='admin');
  if(u){btn.textContent=`Log out (${u.username})`;btn.onclick=e=>{e.preventDefault();localStorage.removeItem('currentUser');location.href='index.html'}}
})();

// ---- book cards
function cardHTML(b){
  const free=freeCopies(b)>0,st=free?'available':'checked-out';
  return `<article class="book-card" data-book-id="${b.id}" data-type="${b.type}" data-status="${st}" tabindex="0">
  <div class="book-card__cover" aria-hidden="true" style="background:${coverStyle(b)}">${esc(softBreak(b.title))}</div>
  <div class="book-card__meta"><span class="tag tag--${b.type}">${TYPES[b.type]}</span><span class="status status--${st}">${free?'Available':'Checked out'}</span></div>
  <h3 class="book-card__title">${esc(softBreak(b.title))}</h3><p class="book-card__author">${esc(softBreak(b.author))}</p></article>`;
}
function openBook(id){
  const m=$('#book-modal');
  if(!m)return location.href='book-details.html?id='+id;
  showDetails(m,findBook(id));m.showModal();
}
document.addEventListener('click',e=>{const c=e.target.closest('.book-card');if(c)openBook(c.dataset.bookId)});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.classList.contains('book-card'))openBook(e.target.dataset.bookId)});

// ---- book details (used by the pop-up and by book-details.html)
function showDetails(root,b){
  $('.book-details',root).dataset.bookId=b.id;
  const f=k=>$(`[data-field="${k}"]`,root),u=me(),free=freeCopies(b),chs=chaptersOf(b),prog=u?.progress[b.id];
  Object.assign(f('cover'),{textContent:softBreak(b.title)});f('cover').style.background=coverStyle(b);
  f('title').textContent=softBreak(b.title);f('author').textContent=softBreak(b.author);f('genre').textContent=b.genre;
  f('year').textContent=b.year<0?Math.abs(b.year)+' BC':b.year;f('type').textContent=TYPES[b.type];f('description').textContent=softBreak(b.desc);
  const av=f('availability');av.textContent=free>0?`Available (${free} of ${b.copies} copies)`:`Checked out (0 of ${b.copies} copies)`;av.className='status status--'+(free>0?'available':'checked-out');
  $('#chapter-section',root).hidden=chs.length<2;
  $('#chapter-list',root).innerHTML=chs.map(c=>`<li><a href="reader.html?id=${b.id}&ch=${c.number}">Chapter ${c.number}: ${esc(c.title)}</a></li>`).join('');
  const has=u?.loans.includes(b.id),wait=u?.waits.includes(b.id),can=canRead(b,u),rd=$('#btn-read',root),loan=f('loan');
  rd.textContent=can?(prog?'Continue reading':'Read online'):'Not available to read';
  if(can){rd.href=`reader.html?id=${b.id}`+(prog?`&ch=${prog.ch}`:'');rd.removeAttribute('aria-disabled');rd.classList.remove('is-disabled')}
  else{rd.removeAttribute('href');rd.setAttribute('aria-disabled','true');rd.classList.add('is-disabled')}
  if(loan){      // live countdown for the borrower, or a notice when every copy is out
    if(has){loan.hidden=false;loan.dataset.due=u.due[b.id];loan.dataset.prefix='You have ';loan.dataset.suffix=' left to return it.';loan.textContent=`You have ${fmtLeft(u.due[b.id])} left to return it.`}
    else if(!can){loan.hidden=false;delete loan.dataset.due;loan.textContent='All copies are borrowed, so this book cannot be read until one is returned.'}
    else{loan.hidden=true;delete loan.dataset.due}
  }
  $('#btn-list',root).textContent=u?.list.includes(b.id)?'Remove from reading list':'Add to reading list';
  $('#btn-borrow',root).hidden=has||wait||free<1;
  $('#btn-return',root).hidden=!has;
  $('#btn-wait',root).hidden=has||wait||free>0;
  $('#btn-unwait',root).hidden=!wait;
}
function bindDetails(root){
  root.addEventListener('click',e=>{
    const id=e.target.closest('button')?.id,b=findBook($('.book-details',root).dataset.bookId);
    if(!id||!b)return;
    const acts={
      'btn-list':u=>u.list=u.list.includes(b.id)?u.list.filter(i=>i!==b.id):[...u.list,b.id],
      'btn-borrow':u=>{if(freeCopies(b)>0){u.loans.push(b.id);(u.due=u.due||{})[b.id]=Date.now()+LOAN_MS;toast('Borrowed for 7 days')}},
      'btn-return':u=>returnBook(u,b.id),
      'btn-wait':u=>{u.waits.push(b.id);toast('You joined the waitlist')},
      'btn-unwait':u=>u.waits=u.waits.filter(i=>i!==b.id)
    };
    if(!acts[id])return;
    const u=me();if(!u){location.href='login.html';return}
    acts[id](u);saveUsers();showDetails(root,b);window.onLibraryChange?.();
  });
}

// ---- countdowns: any element with data-due ticks every second; when a loan runs out it is returned and the page reloads
if(expireLoans()&&!users.find(u=>u.username===current)?.loans.length)toast('A borrowed book was returned because its week ended.');
setInterval(()=>{
  let over=false;
  $$('[data-due]').forEach(e=>{const due=+e.dataset.due;if(!due)return;if(due<=Date.now())over=true;else e.textContent=(e.dataset.prefix||'')+fmtLeft(due)+(e.dataset.suffix||'')});
  if(over){expireLoans();location.reload()}
},1000);

// ---- loading the library
const loadPages=async(b,c)=>pagesOf(c);
const loadText=async(b,c)=>{
  const f=c?.textFile||b.textFile;
  if(f){
    try{const r=await fetch(f);if(r.ok)return await r.text()}catch{}
    return 'Could not load the text file. Open the site through a web server (VS Code Live Server or the hosted site), not by double-clicking the HTML file.';
  }
  return b.text||'';
};
const mergeExtra=list=>[...list,...EXTRA.filter(x=>!list.some(b=>b.id===x.id)).map(x=>({...x,fromFile:true}))].sort((a,b)=>a.id-b.id);
let libraryError=false;
async function loadLibrary(fresh){      // fresh = ask the server for a new copy instead of using the browser's saved one
  try{
    const r=await fetch('library/books.json'+(fresh?'?t='+Date.now():''),{cache:fresh?'reload':'no-cache'});
    if(!r.ok)throw 0;
    books=mergeExtra(await r.json());libraryError=false;
  }catch{libraryError=true}
}
const ready=(async()=>{
  await loadLibrary();
  if(libraryError)$('main')?.insertAdjacentHTML('afterbegin','<p class="form-error">Could not load library/books.json. If you opened this file directly, use a web server instead (for example the VS Code Live Server extension).</p>');
})();
// finds a book; if it is missing, loads a fresh copy of the list once and looks again
async function findBookOrReload(id){
  let b=findBook(id);
  if(!b){await loadLibrary(true);b=findBook(id)}
  return b;
}
const notFoundHTML=id=>`<p>Book not found${id?` (id ${esc(id)})`:''}. ${libraryError?'The library list could not be loaded, so check your connection and refresh the page.':`The library has ${books.length} book${books.length===1?'':'s'}.`} <a href="catalog.html">Back to catalog</a></p>`;
