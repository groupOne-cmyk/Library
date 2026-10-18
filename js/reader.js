ready.then(async()=>{
const params=new URLSearchParams(location.search),book=await findBookOrReload(params.get('id'));
if(!book){$('main').innerHTML=notFoundHTML(params.get('id'))}
else (async()=>{
  if(!canRead(book,me())){
    $('main').innerHTML=`<p>This book cannot be read right now because all copies are borrowed. You can read it once one is returned.</p><p><a href="book-details.html?id=${book.id}">Back to the book</a></p>`;
    return;
  }
  const chs=chaptersOf(book),u=me(),ci=Math.max(0,chs.findIndex(c=>c.number==params.get('ch'))),ch=chs[ci],next=chs[ci+1],prev=chs[ci-1];
  const end=$('#chapter-end'),goCh=n=>location.href=`reader.html?id=${book.id}&ch=${n}`;
  const show=id=>['text-reader','page-reader','strip-reader'].forEach(x=>$('#'+x).hidden=x!==id);
  const saveProgress=p=>{if(u&&ch){u.progress[book.id]={ch:ch.number,page:p};saveUsers()}};
  $('#reader-title').textContent=book.title+(chs.length>1?` – Chapter ${ch.number}: ${ch.title}`:'');
  document.title=book.title+' | Online Library';
  const loanDue=u?.due?.[book.id];
  if(loanDue)$('#reader-title').insertAdjacentHTML('afterend',`<span class="loan-timer" data-due="${loanDue}" data-prefix="Return within ">Return within ${fmtLeft(loanDue)}</span>`);

  if(chs.length>1){ 
    $('#chapter-nav').hidden=false;
    $('#chapter-select').innerHTML=chs.map(c=>`<option value="${c.number}"${c===ch?' selected':''}>Chapter ${c.number}: ${esc(c.title)}</option>`).join('');
    $('#chapter-select').onchange=e=>goCh(e.target.value);
    $('#chapter-prev').disabled=!prev;$('#chapter-next').disabled=!next;
    $('#chapter-prev').onclick=()=>goCh(prev.number);$('#chapter-next').onclick=()=>goCh(next.number);
    end.hidden=false;$('#end-prev').disabled=!prev;$('#end-next').disabled=!next;
    $('#end-prev').onclick=()=>goCh(prev.number);$('#end-next').onclick=()=>goCh(next.number);
  }

  if(book.type==='text'||!ch){
    show('text-reader');
    $('#text-body').innerHTML=(await loadText(book,ch)||'Nothing to read here yet.').split(/\n\s*\n/).map(p=>`<p>${esc(softBreak(p))}</p>`).join('');
    if(ch)saveProgress(0);
  }else{
    const pages=await loadPages(book,ch);
    if(book.type==='manga'||book.type==='manhwa'){
      show('strip-reader');
      $('#strip-body').innerHTML=pages.map((s,i)=>`<img src="${s}" alt="Page ${i+1}" loading="lazy">`).join('');
      saveProgress(0);
    }else{
      show('page-reader');
      const saved=u?.progress[book.id];
      let p=saved&&saved.ch==ch.number?Math.min(saved.page,pages.length-1):0;
      const draw=()=>{
        $('#page-image').src=pages[p];$('#page-image').alt=`Page ${p+1}`;
        $('#page-counter').textContent=`Page ${p+1} of ${pages.length}`;
        $('#page-next').textContent=p===pages.length-1&&next?'Next chapter':'Next';saveProgress(p);
      };
      const step=d=>{
        if(d>0&&p===pages.length-1){if(next)goCh(next.number);return}
        p=Math.min(pages.length-1,Math.max(0,p+d));draw();
      };
      $('#page-prev').onclick=()=>step(-1);$('#page-next').onclick=()=>step(1);
      document.addEventListener('keydown',e=>{
        if(e.key==='ArrowRight')step(1);
        if(e.key==='ArrowLeft')step(-1);
      });
      if(pages.length)draw();
    }
  }
})();
});
