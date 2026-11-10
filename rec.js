/* Session recordings for real visitors (open-source rrweb, self-hosted in /vendor/rrweb).
   Loaded by t.js only for visitors that are already being counted (never admins, bots, Do Not Track).
   Everything typed into a form is masked, members/login pages are never recorded, and nothing is
   uploaded until the visit looks human: a click, a 25% scroll, or 10s on the page after moving/touching. */
(function(){
  var w=window,d=document;
  if(w.__rec)return;w.__rec=1;
  var SB='https://yhsxxblilclylzgejehk.supabase.co',KEY='sb_publishable_9BiONVmj8Ht4k7lBsxGkkA_Yajbl8Rj';
  var PRIVATE=/^#(members|login|reset|admin|thanks)|access_token=/;
  function ss(k,v){try{if(v===undefined)return sessionStorage.getItem(k);sessionStorage.setItem(k,v)}catch(e){return null}}
  function ls(k){try{return localStorage.getItem(k)}catch(e){return null}}
  if(ls('no_track')||PRIVATE.test(location.hash))return;
  var sid=ss('s_id'),vid=ls('v_id');if(!sid)return;
  var buf=[],real=false,stop=null,bytes=0,started=Date.now(),input=false,sending=false,timer=null;
  var MAXB=4e6,MAXT=30*60e3;
  function seq(){var n=+(ss('r_seq_'+sid)||0);ss('r_seq_'+sid,String(n+1));return n}
  function post(row,keep){
    try{return fetch(SB+'/rest/v1/replay_chunks',{method:'POST',keepalive:!!keep,headers:{apikey:KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(row)}).catch(function(){})}catch(e){}
  }
  function gz(str){
    if(!w.CompressionStream)return Promise.resolve('j:'+str);
    var s=new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Response(s).arrayBuffer().then(function(b){
      var u=new Uint8Array(b),out='',i;for(i=0;i<u.length;i+=32768)out+=String.fromCharCode.apply(null,u.subarray(i,i+32768));
      return 'g:'+btoa(out);
    });
  }
  function flush(final){
    if(!real||!buf.length||(sending&&!final))return;
    var ev=buf;buf=[];var str=JSON.stringify(ev);
    if(final){if(str.length<60000)post({sid:sid,vid:vid,seq:seq(),data:'j:'+str},true);return}
    sending=true;
    gz(str).then(function(data){
      var n=seq();
      // very large first snapshots are split so each row stays small
      var parts=[];for(var i=0;i<data.length;i+=350000)parts.push(data.slice(i,i+350000));
      var rows=parts.length===1?[{sid:sid,vid:vid,seq:n,data:data}]:parts.map(function(p,k){return {sid:sid,vid:vid,seq:n,part:k,parts:parts.length,data:p}});
      return Promise.all(rows.map(function(r){return post(r)}));
    }).then(function(){sending=false},function(){sending=false});
  }
  function becomeReal(){if(real)return;real=true;flush();timer=setInterval(function(){flush()},5000)}
  function end(){if(stop){try{stop()}catch(e){}stop=null}flush(true);clearInterval(timer)}
  // human signals
  ['pointermove','touchstart','wheel','keydown'].forEach(function(t){w.addEventListener(t,function(){input=true},{passive:true,once:true})});
  d.addEventListener('click',function(){becomeReal()},true);
  w.addEventListener('scroll',function(){var de=d.documentElement,h=Math.max(de.scrollHeight,d.body.scrollHeight);if((w.pageYOffset+w.innerHeight)/h>=.25&&h>w.innerHeight*1.3)becomeReal()},{passive:true});
  setTimeout(function(){if(input&&d.visibilityState==='visible')becomeReal()},10000);
  setTimeout(function(){if(input)becomeReal()},20000);
  d.addEventListener('visibilitychange',function(){if(d.visibilityState==='hidden')flush(true)});
  w.addEventListener('pagehide',function(){flush(true)});
  w.addEventListener('hashchange',function(){if(PRIVATE.test(location.hash)){buf=[];if(stop){try{stop()}catch(e){}stop=null}clearInterval(timer);real=false}});
  var sc=d.createElement('script');sc.src='/vendor/rrweb/record.min.js';sc.async=true;
  sc.onload=function(){
    if(!w.rrwebRecord||PRIVATE.test(location.hash))return;
    stop=w.rrwebRecord.record({
      emit:function(e){
        if(Date.now()-started>MAXT){end();return}
        var n=JSON.stringify(e).length;bytes+=n;if(bytes>MAXB){end();return}
        buf.push(e);
      },
      maskAllInputs:true,
      maskTextSelector:'[data-private],.private',
      blockSelector:'[data-norecord],iframe',
      inlineStylesheet:true,
      recordCanvas:false,
      collectFonts:false,
      sampling:{mousemove:120,scroll:150,media:800,input:'last'},
      slimDOMOptions:{script:true,comment:true,headFavicon:true,headWhitespace:true,headMetaSocial:true,headMetaRobots:true,headMetaHttpEquiv:true,headMetaAuthorship:true,headMetaVerification:true}
    });
  };
  d.head.appendChild(sc);
})();
