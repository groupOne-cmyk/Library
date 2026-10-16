// Book details page: book-details.html?id=1
ready.then(async()=>{
const id=new URLSearchParams(location.search).get('id'),b=await findBookOrReload(id);
if(!b){$('main').innerHTML=notFoundHTML(id)}
else{document.title=b.title+' | Online Library';bindDetails(document.body);showDetails(document,b)}
});
