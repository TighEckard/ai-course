/* Inline free-class signup for guide and city pages: saves the seat right on the page
   instead of sending people to the homepage first. Same signups table as the homepage. */
(function(){
  var SB='https://yhsxxblilclylzgejehk.supabase.co',KEY='sb_publishable_9BiONVmj8Ht4k7lBsxGkkA_Yajbl8Rj';
  var d=document,w=window;
  var SL=[[2,19,'Tuesday','7:00 PM'],[4,19,'Thursday','7:00 PM'],[6,10,'Saturday','10:00 AM']];
  var W={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};
  function et(x){var p={};new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',hour12:false,weekday:'short'}).formatToParts(x).forEach(function(q){p[q.type]=q.value});return p}
  function lbl(y,m,dd,h){var t=Date.UTC(y,m-1,dd,h+5);var q=et(new Date(t));if(parseInt(q.hour,10)%24!==h)t-=36e5;var x=new Date(t);
    try{var tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'America/New_York';var o={timeZone:tz,weekday:'short',month:'short',day:'numeric'};return x.toLocaleDateString('en-US',o)+', '+x.toLocaleTimeString('en-US',{timeZone:tz,hour:'numeric',minute:'2-digit',timeZoneName:'short'})}catch(e){return x.toUTCString()}}
  var now=new Date(),n=et(now),nowMin=(parseInt(n.hour,10)%24)*60+parseInt(n.minute,10);
  var slots=SL.map(function(s){for(var k=0;k<8;k++){var dd=new Date(now.getTime()+k*864e5),e=et(dd);if(W[e.weekday]===s[0]&&!(k===0&&nowMin>=s[1]*60)){return {k:k*1440+s[1]*60,value:s[2]+', '+s[3],label:lbl(+e.year,+e.month,+e.day,s[1]),y:+e.year,m:+e.month,d:+e.day,h:s[1]}}}return null}).filter(Boolean).sort(function(a,b){return a.k-b.k});
  var first=slots[0];
  var src=(function(){var a=d.querySelector('.cta a[href*="src="]')||d.querySelector('a[href*="src="][href*="#reserve"]');var m=a&&/src=([^&#]+)/.exec(a.getAttribute('href'));return m?decodeURIComponent(m[1]).slice(0,60):'seo:'+location.pathname.slice(0,55)})();
  var css='.rs-f{display:grid;gap:.6rem;margin:1rem auto 0;max-width:24rem;text-align:left}.rs-f label{display:grid;gap:.2rem;font-weight:600;font-size:.92rem}.rs-f input,.rs-f select{font:inherit;font-size:1.05rem;min-height:3rem;padding:.55rem .8rem;border:1.5px solid #c9c2b4;border-radius:10px;background:#fff;color:#2B2F36;width:100%}.rs-f button{font:inherit;font-weight:700;font-size:1.08rem;min-height:3.2rem;border:0;border-radius:10px;background:#E9A23B;color:#1b1b1b;cursor:pointer;margin-top:.2rem}.rs-f .rs-e{color:#ffd9d9;font-size:.9rem;margin:0}.rs-f .rs-s{font-size:.85rem;opacity:.9;margin:0;text-align:center}.rs-ok{background:#EDF7F0;color:#1f3b2a;border-radius:12px;padding:1rem 1.2rem;margin:1rem auto 0;max-width:24rem;text-align:left}.rs-ok b{display:block;font-size:1.1rem}.rs-ok a{color:#143059;font-weight:600}.cta .rs-ok p,.rs-ok p{color:#1f3b2a;margin:.5rem 0 0}.rs-next{display:inline-block;background:#FBEBCB;color:#143059;font-weight:700;border-radius:10px;padding:.35rem .8rem;font-size:.92rem;margin-top:.6rem}.cta .rs-next{margin-top:.8rem}.rs-top{margin-top:1.4rem}.rs-bar{position:fixed;left:0;right:0;bottom:0;z-index:20;background:#143059;color:#fff;padding:.6rem max(16px,env(safe-area-inset-left,0px)) calc(.6rem + env(safe-area-inset-bottom,0px));display:flex;gap:.8rem;align-items:center;justify-content:space-between;box-shadow:0 -4px 16px rgba(0,0,0,.15);font-size:.9rem}.rs-bar a{background:#E9A23B;color:#1b1b1b;font-weight:700;text-decoration:none;border-radius:10px;padding:.6rem 1rem;white-space:nowrap}@media(min-width:900px){.rs-bar{display:none}}';
  var st=d.createElement('style');st.textContent=css;d.head.appendChild(st);
  function el(t,a,kids){var e=d.createElement(t);for(var k in a||{}){if(k==='text')e.textContent=a[k];else e.setAttribute(k,a[k])}(kids||[]).forEach(function(c){if(c)e.appendChild(c)});return e}
  var uid=0;
  function fixMail(v){var m=/^(.+@)(gmial|gmal|gmai|gnail|gmail\.co|gamil|hotmial|hotmal|yaho|yahooo|outlok|iclod|icoud)(\.[a-z.]+)?$/i.exec(v);if(!m)return v;var fx={gmial:'gmail',gmal:'gmail',gmai:'gmail',gnail:'gmail','gmail.co':'gmail',gamil:'gmail',hotmial:'hotmail',hotmal:'hotmail',yaho:'yahoo',yahooo:'yahoo',outlok:'outlook',iclod:'icloud',icoud:'icloud'}[m[2].toLowerCase()];return m[1]+fx+'.com'}
  function gcal(s){function p(x){return(x<10?'0':'')+x}var start=''+s.y+p(s.m)+p(s.d)+'T'+p(s.h)+'0000',end=''+s.y+p(s.m)+p(s.d)+'T'+p(s.h+1)+'0000';return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent('Free AI class (Riside)')+'&dates='+start+'/'+end+'&ctz=America/New_York&details='+encodeURIComponent('Live on Zoom with Holden. Your Zoom link arrives by email before class. https://riside.com')}
  function form(dark){
    uid++;var i='rs'+uid;
    var sel=el('select',{id:i+'w'});slots.forEach(function(s){var o=el('option',{value:s.value,text:s.label});sel.appendChild(o)});
    var nm=el('input',{id:i+'n',type:'text',autocomplete:'given-name',required:''}),em=el('input',{id:i+'m',type:'email',autocomplete:'email',inputmode:'email',required:''});
    var er=el('p',{class:'rs-e',role:'alert',hidden:''}),btn=el('button',{type:'submit',text:'Save my free seat'});
    var f=el('form',{class:'rs-f',novalidate:''},[el('label',{for:i+'n'},[d.createTextNode('First name'),nm]),el('label',{for:i+'m'},[d.createTextNode('Email address'),em]),el('label',{for:i+'w'},[d.createTextNode('Pick a free class'),sel]),btn,er,el('p',{class:'rs-s',text:'Free. No card. We only use your email to send your Zoom link.'})]);
    if(!dark){er.style.color='#B42318'}
    f.addEventListener('submit',function(ev){
      ev.preventDefault();var name=nm.value.trim(),mail=fixMail(em.value.trim());em.value=mail;
      if(!name||!/^\S+@\S+\.\S+$/.test(mail)){er.textContent='Please enter your first name and a full email address.';er.hidden=false;return}
      er.hidden=true;btn.disabled=true;btn.textContent='Saving...';
      var s=slots[sel.selectedIndex]||first;
      fetch(SB+'/rest/v1/signups',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({name:name.slice(0,80),email:mail.slice(0,120),slot:s.value,source:src,variant:'inline-v1'})}).then(function(r){
        if(!r.ok)throw 0;if(w.AT)AT.signup();
        var ok=el('div',{class:'rs-ok',role:'status'},[el('b',{text:'You are in, '+name+'.'}),el('p',{text:'Your free seat is saved for '+s.label+'. We will email your Zoom link to '+mail+' before class (check spam too). Click it a few minutes early.'}),el('p',{},[el('a',{href:gcal(s),target:'_blank',rel:'noopener',text:'Add it to my Google Calendar'})])]);
        f.parentNode.replaceChild(ok,f);
        d.querySelectorAll('.rs-f').forEach(function(x){x.style.display='none'});var b=d.querySelector('.rs-bar');if(b)b.remove();
      }).catch(function(){btn.disabled=false;btn.textContent='Save my free seat';er.textContent='Something went wrong. Please try again, or email admin@ovoa.ai.';er.hidden=false});
    });
    return f;
  }
  if(!first)return;
  var ctas=[].slice.call(d.querySelectorAll('.cta')).filter(function(c){return c.querySelector('a[href*="#reserve"]')});
  ctas.forEach(function(c){var a=c.querySelector('a[href*="#reserve"]');var nx=el('div',{},[el('span',{class:'rs-next',text:'Next free class: '+first.label})]);a.parentNode.insertBefore(nx,a);a.parentNode.replaceChild(form(true),a)});
  // guides: also offer the seat near the top, not only at the very end
  var art=d.querySelector('article'),lede=art&&art.querySelector('.lede');
  var nx2=lede&&lede.nextElementSibling;if(art&&lede&&!(nx2&&nx2.classList.contains('cta'))){
    var top=el('div',{class:'cta rs-top'},[el('h2',{text:'Learn this live, free'}),el('p',{text:'One hour on Zoom with a patient teacher and a small group. No experience needed.'}),el('div',{},[el('span',{class:'rs-next',text:'Next free class: '+first.label})]),form(true)]);
    lede.parentNode.insertBefore(top,lede.nextSibling);
  }
  var target=d.querySelector('.rs-f');
  if(target){
    var bar=el('div',{class:'rs-bar'},[el('span',{style:'line-height:1.3',text:'Free live class '+first.label.replace(/^(\w+), \w+ \d+, /,'$1 ')}),el('a',{href:'#',text:'Save a seat'})]);
    bar.querySelector('a').addEventListener('click',function(e){e.preventDefault();var f=d.querySelector('.rs-f');if(f){f.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(function(){var i=f.querySelector('input');if(i)i.focus({preventScroll:true})},450)}});
    d.body.appendChild(bar);d.body.style.paddingBottom='4.5rem';
    if('IntersectionObserver' in w){var on=[];var io=new IntersectionObserver(function(en){en.forEach(function(x){var j=on.indexOf(x.target);if(x.isIntersecting&&j<0)on.push(x.target);if(!x.isIntersecting&&j>=0)on.splice(j,1)});bar.style.display=on.length?'none':''});d.querySelectorAll('.rs-f').forEach(function(f){io.observe(f)})}
  }
})();
