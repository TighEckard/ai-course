/* Cookieless first-party visitor stats. Sends page views, scroll depth and clicks to our own database.
   No IP address, name or email is stored. Skipped for admins, bots, Do Not Track and embeds. */
(function(){
  var SB='https://yhsxxblilclylzgejehk.supabase.co',KEY='sb_publishable_9BiONVmj8Ht4k7lBsxGkkA_Yajbl8Rj';
  var VIEWS=['join','privacy','terms','login','members','thanks','reset','scamcheck','gift'];
  var nav=navigator,ua=nav.userAgent||'',w=window,d=document;
  function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
  function ss(k,v){try{if(v===undefined)return sessionStorage.getItem(k);sessionStorage.setItem(k,v)}catch(e){return null}}
  if(w.top!==w.self||nav.webdriver||/bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit/i.test(ua)||nav.doNotTrack==='1'||nav.globalPrivacyControl||ls('no_track')||/[?&]notrack/.test(location.search))return;
  var rid=function(){return Math.random().toString(36).slice(2,10)+Date.now().toString(36)};
  var vid=ls('v_id'),isNew=!vid;if(isNew){vid=rid();ls('v_id',vid)}
  var sid,now=Date.now(),last=+ss('s_ts')||0;
  if(ss('s_id')&&now-last<18e5)sid=ss('s_id');else{sid=rid();ss('s_id',sid);ss('s_src','');ss('s_n','0')}
  ss('s_ts',String(now));
  var device=/iPad|Tablet/.test(ua)||(/Android/.test(ua)&&!/Mobile/.test(ua))?'tablet':/Mobi|iPhone|Android/.test(ua)?'mobile':'desktop';
  var browser=/FBAN|FBAV/.test(ua)?'Facebook app':/Instagram/.test(ua)?'Instagram app':/Edg\//.test(ua)?'Edge':/OPR\//.test(ua)?'Opera':/Firefox|FxiOS/.test(ua)?'Firefox':/Chrome|CriOS/.test(ua)?'Chrome':/Safari/.test(ua)?'Safari':'Other';
  var os=/Windows/.test(ua)?'Windows':/iPhone|iPad|iPod/.test(ua)?'iOS':/Android/.test(ua)?'Android':/Mac OS/.test(ua)?'macOS':/CrOS/.test(ua)?'ChromeOS':/Linux/.test(ua)?'Linux':'Other';
  function source(){
    var saved=ss('s_src');if(saved)return JSON.parse(saved);
    var q=new URLSearchParams(location.search),r={},h='';
    try{h=d.referrer?new URL(d.referrer).hostname.replace(/^www\./,''):''}catch(e){}
    if(h===location.hostname.replace(/^www\./,''))h='';
    var s=(q.get('utm_source')||q.get('src')||'').toLowerCase();
    if(!s&&q.get('fbclid'))s='facebook';
    if(!s&&h){s=/facebook\.com$|fb\.com$/.test(h)?'facebook':/instagram\.com$/.test(h)?'instagram':/google\./.test(h)?'google':/bing\.com$/.test(h)?'bing':/duckduckgo\.com$/.test(h)?'duckduckgo':/(^|\.)t\.co$|twitter\.com$|x\.com$/.test(h)?'x':/youtube\.com$/.test(h)?'youtube':/reddit\.com$/.test(h)?'reddit':/linkedin\.com$/.test(h)?'linkedin':h}
    r={src:(s||'direct').slice(0,100),ref_host:h.slice(0,100),utm_medium:(q.get('utm_medium')||'').slice(0,100)||null,utm_campaign:(q.get('utm_campaign')||'').slice(0,100)||null};
    ss('s_src',JSON.stringify(r));return r;
  }
  var path,depth,start,shown,vis=true,q=[],timer,geo=null,clicks=+ss('s_n')||0;
  function curPath(){if(/^\/guides\//.test(location.pathname))return location.pathname.replace(/index\.html$/,'');var h=location.hash.slice(1);if(h.indexOf('access_token=')>-1)return '/members';return VIEWS.indexOf(h)>-1?'/'+h:h==='admin'?null:'/'}
  function push(ev){q.push(ev);clearTimeout(timer);timer=setTimeout(flush,3000)}
  function flush(){
    if(!q.length)return;var b=q;q=[];
    try{fetch(SB+'/rest/v1/analytics_events',{method:'POST',keepalive:true,headers:{apikey:KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(b)}).catch(function(){})}catch(e){}
  }
  function base(type){return {vid:vid,sid:sid,type:type,path:path}}
  function leave(){
    if(!path)return;
    var t=shown+(vis?Date.now()-start:0);
    var e=base('scroll');e.depth=Math.min(100,Math.round(depth));e.dur=Math.min(t,36e5);push(e);flush();
  }
  function measure(){var de=d.documentElement,h=Math.max(de.scrollHeight,d.body.scrollHeight),v=w.innerHeight;depth=Math.max(depth,Math.min(100,(w.pageYOffset+v)/h*100))}
  function enter(){
    path=curPath();depth=0;shown=0;start=Date.now();
    if(!path)return;
    measure();
    var s=source(),e=base('view');
    e.src=s.src;e.ref_host=s.ref_host||null;e.utm_medium=s.utm_medium;e.utm_campaign=s.utm_campaign;
    e.new_visitor=isNew;isNew=false;e.device=device;e.browser=browser;e.os=os;e.vw=w.innerWidth;e.vh=w.innerHeight;
    if(geo){e.country=geo.country;e.region=geo.region;e.city=geo.city}
    push(e);
  }
  function getGeo(cb){
    var c=ss('s_geo');if(c){try{geo=JSON.parse(c)}catch(e){}return cb()}
    var done=false,fin=function(){if(!done){done=true;cb()}};setTimeout(fin,1500);
    try{fetch('https://ipwho.is/?fields=success,country,region,city').then(function(r){return r.json()}).then(function(j){
      if(j&&j.success){geo={country:(j.country||'').slice(0,60)||null,region:(j.region||'').slice(0,80)||null,city:(j.city||'').slice(0,80)||null};ss('s_geo',JSON.stringify(geo))}fin()}).catch(fin)}catch(e){fin()}
  }
  w.addEventListener('scroll',function(){if(!w._at){w._at=1;requestAnimationFrame(function(){w._at=0;measure()})}},{passive:true});
  d.addEventListener('click',function(ev){
    if(!path||clicks>=60)return;clicks++;ss('s_n',String(clicks));
    var t=ev.target,el=t.closest&&t.closest('a,button,summary,label,input,select,textarea');
    var name=el?(el.tagName.toLowerCase()+':'+(el.id||(el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.tagName==='SELECT'?el.name||el.type:(el.textContent||'').replace(/\s+/g,' ').trim())).slice(0,60)):null;
    var de=d.documentElement,W=Math.max(de.scrollWidth,de.clientWidth);
    var e=base('click');e.x=Math.max(0,Math.min(1000,Math.round(ev.pageX/W*1000)));e.y=Math.round(ev.pageY);e.vw=w.innerWidth;e.el=name;push(e);
  },true);
  d.addEventListener('visibilitychange',function(){
    if(d.visibilityState==='hidden'){if(vis){shown+=Date.now()-start;vis=false}leave();shown=0;depth=Math.max(depth,0)}
    else if(!vis){vis=true;start=Date.now()}
  });
  w.addEventListener('pagehide',flush);
  w.addEventListener('hashchange',function(){leave();vis=d.visibilityState!=='hidden';enter()});
  w.AT={signup:function(){var e=base('signup');if(!e.path)e.path='/';push(e);flush()}};
  getGeo(function(){enter()});
})();
