// File check page: opens every file of the site fresh and checks that it is the newest version.
// It does not use app.js, so it still works when app.js is old or broken.
const BUILD='8';
const V='?v='+BUILD;
const FILES=[
  ['index.html',[V,'js/home.js']],['catalog.html',[V,'data-field="loan"','js/catalog.js']],['book-details.html',[V,'data-field="loan"','id="chapter-list"','js/book-details.js']],
  ['reader.html',[V,'id="chapter-end"','id="end-prev"','id="strip-reader"']],['my-library.html',[V,'id="continue-section"']],
  ['admin.html',[V,'id="text-chapter-rows"','id="tc-jump"','id="book-genre"']],['login.html',[V,'id="login-form"']],
  ['js/app.js',['findBookOrReload','canRead','softBreak','mergeExtra','LOAN_MS']],
  ['js/book-details.js',['findBookOrReload','notFoundHTML']],
  ['js/reader.js',["book.type==='manga'||book.type==='manhwa'",'notFoundHTML','canRead']],
  ['js/catalog.js',['ready.then']],['js/home.js',['ready.then']],['js/my-library.js',['ready.then','fmtLeft']],
  ['js/admin.js',['RETRY_DELAYS','convertAll','text-chapter-rows']],['js/login.js',['login-form']],
  ['css/style.css',['loan-timer','chapter-pager','overflow-wrap','check-ok']],
  ['library/books.json',[]]
];
const rows=document.getElementById('results'),summary=document.getElementById('check-summary');
const fresh=p=>fetch(p+'?t='+Date.now(),{cache:'reload'});
function addRow(file,text,ok){
  const tr=document.createElement('tr');
  tr.innerHTML='<td></td><td></td>';
  tr.children[0].textContent=file;tr.children[1].textContent=text;tr.children[1].className=ok?'check-ok':'check-bad';
  rows.append(tr);
}
(async()=>{
  let problems=0;
  for(const [file,marks] of FILES){
    let r;
    try{r=await fresh(file)}catch{addRow(file,'Could not reach the server',false);problems++;continue}
    if(!r.ok){addRow(file,'MISSING: this file is not on the site',false);problems++;continue}
    const text=await r.text(),missing=marks.filter(m=>!text.includes(m));
    if(missing.length){addRow(file,'OLD VERSION: this file does not contain "'+missing[0]+'". Upload the newest copy.',false);problems++}
    else addRow(file,'OK',true);
  }
  // files that were uploaded to the wrong place (the top level instead of the js or css folder)
  for(const [file] of FILES.filter(f=>/^(js|css)\//.test(f[0]))){
    const name=file.split('/')[1];
    try{const r=await fresh(name);if(r.ok){addRow(name,'WRONG PLACE: this file is also at the top level of the site. It belongs only inside the '+file.split('/')[0]+' folder, so delete the top-level copy.',false);problems++}}catch{}
  }
  // the books themselves: does the first file of each book exist?
  try{
    const list=await (await fresh('library/books.json')).json();let checked=0,missing=0;
    for(const b of list.slice(0,25)){
      const c=(b.chapters||[])[0],first=c?(c.textFile||`${c.folder}/${String(1).padStart(c.pad||3,'0')}.${c.ext||'webp'}`):b.textFile;
      if(!first)continue;checked++;
      try{if(!(await fresh(first)).ok)missing++}catch{missing++}
    }
    addRow('your books',`${list.length} book${list.length===1?'':'s'} in the library. First file checked for ${checked}: ${missing?missing+' not found':'all found'}.`,!missing);
    if(missing)problems++;
  }catch{addRow('your books','Could not read library/books.json',false);problems++}
  summary.textContent=problems?`${problems} problem${problems===1?'':'s'} found. Upload the files marked in red again, then reload this page.`:'Everything is up to date.';
})();
