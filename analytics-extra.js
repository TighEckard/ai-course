/* Admin > Analytics extras: sessions, locations, world map, replays, traffic attribution, raw data.
   Everything is built from the events already stored in analytics_events. No new data is captured. */
(function(){
  var M=window.AAMAP||{iso:{},cent:{},alias:{}};
  var HR=36e5,DAY=864e5;
  var COL={facebook:'#1877F2',instagram:'#C13584',youtube:'#D93025',pinterest:'#BD081C',other:'#7A6A3A'};
  function flag(country){var c=M.iso[country];if(!c||c.length!==2)return '🌐';return String.fromCodePoint(127397+c.charCodeAt(0),127397+c.charCodeAt(1))}
  function esc(s){return String(s==null?'':s)}
  function pct(a,b){return b?Math.round(a/b*100):0}
  function fmtT(ms){var s=Math.round(ms/1000);return s<60?s+'s':Math.floor(s/60)+'m '+(s%60)+'s'}
  function when(t){return new Date(t).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}
  function csv(rows,cols){
    var q=function(v){v=v==null?'':String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
    return cols.join(',')+'\n'+rows.map(function(r){return cols.map(function(c){return q(r[c])}).join(',')}).join('\n');
  }
  function download(name,text,type){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:type||'text/csv'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)}
  function loc(s){return [s.city,s.region,s.country].filter(Boolean).join(', ')||'Unknown'}

  // ---- sessions from raw events (events must be ordered by id) ----
  function sessions(ev){
    var by={},list=[];
    ev.forEach(function(e){
      var s=by[e.sid];
      if(!s){s=by[e.sid]={sid:e.sid,vid:e.vid,t:+new Date(e.created_at),ev:[],pages:0,clicks:0,dur:0,depth:0,joined:false,signed:false,src:'direct',paths:[]};list.push(s)}
      s.ev.push(e);
      if(e.type==='view'){
        if(!s.hasView){s.hasView=true;s.t=+new Date(e.created_at);s.src=e.src||'direct';s.ref=e.ref_host;s.camp=e.utm_campaign;s.medium=e.utm_medium;s.device=e.device;s.browser=e.browser;s.os=e.os;s.country=e.country;s.region=e.region;s.city=e.city;s.nv=e.new_visitor;s.vw=e.vw;s.vh=e.vh;s.entry=e.path}
        s.pages++;s.exit=e.path;s.paths.push(e.path);if(e.path==='/join')s.joined=true;
      }
      if(e.type==='click')s.clicks++;
      if(e.type==='signup')s.signed=true;
      if(e.type==='scroll'){s.dur+=e.dur||0;if((e.depth||0)>s.depth)s.depth=e.depth}
    });
    return list.filter(function(s){return s.hasView});
  }

  // ---- geocoding (free, cached) ----
  var GC={};try{GC=JSON.parse(localStorage.getItem('aa_geo')||'{}')}catch(e){}
  var gcBusy=false;
  function gkey(s){return [s.city,s.region,s.country].join('|')}
  function countryXY(name){
    if(name==='United States')return [-98,39.5];
    var c=M.cent[M.alias[name]||name];return c||null;
  }
  function project(lon,lat){return [(lon+180)/360*1000,(90-lat)/180*500]}
  function geocode(list,done){
    if(gcBusy)return;
    var need=[],seen={};
    list.forEach(function(s){if(s.city&&GC[gkey(s)]===undefined&&!seen[gkey(s)]){seen[gkey(s)]=1;need.push(s)}});
    need=need.slice(0,40);if(!need.length)return;gcBusy=true;
    var i=0;
    (function next(){
      if(i>=need.length){gcBusy=false;try{localStorage.setItem('aa_geo',JSON.stringify(GC))}catch(e){}done();return}
      var s=need[i++];
      fetch('https://geocoding-api.open-meteo.com/v1/search?count=10&language=en&format=json&name='+encodeURIComponent(s.city)).then(function(r){return r.json()}).then(function(j){
        var rs=(j&&j.results)||[],best=null;
        rs.forEach(function(r){
          var sc=0;if(r.country&&s.country&&r.country.toLowerCase()===s.country.toLowerCase())sc+=2;
          if(r.admin1&&s.region&&r.admin1.toLowerCase()===s.region.toLowerCase())sc+=3;
          if(!best||sc>best.sc)best={sc:sc,lat:r.latitude,lon:r.longitude}});
        GC[gkey(s)]=best&&best.sc>=2?[Math.round(best.lon*100)/100,Math.round(best.lat*100)/100]:0;
      }).catch(function(){GC[gkey(s)]=0}).then(function(){setTimeout(next,120)});
    })();
  }
  function pos(s){
    var g=GC[gkey(s)],xy=g?g:countryXY(s.country);
    if(!xy)return null;
    var p=project(xy[0],xy[1]),h=0,k=s.vid||'';for(var i=0;i<k.length;i++)h=(h*31+k.charCodeAt(i))|0;
    var a=(h%360)*Math.PI/180,r=(g?1.2:3.5)*((Math.abs(h>>8)%100)/100+.3);
    return [p[0]+Math.cos(a)*r,p[1]+Math.sin(a)*r];
  }

  var VIEWBOX={world:[0,0,1000,500],usa:[147,106,172,82],europe:[467,48,146,108]};
  function mapSvg(ss,view){
    var ns='http://www.w3.org/2000/svg',vb=VIEWBOX[view],k=vb[2]/1000;
    var svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',vb.join(' '));svg.setAttribute('class','aa-chart');svg.setAttribute('role','img');svg.setAttribute('aria-label','Map of visitors');svg.style.cssText='width:100%;height:auto;max-width:960px;background:#EAF1F6;border-radius:10px';
    function el(t,a){var e=document.createElementNS(ns,t);for(var n in a)e.setAttribute(n,a[n]);svg.appendChild(e);return e}
    el('path',{d:M.land,fill:'#fff',stroke:'#C9D2DA','stroke-width':.5*k});
    var seen={};
    ss.forEach(function(s){
      var p=pos(s);if(!p)return;
      var key=s.vid+'|'+gkey(s);if(seen[key])return;seen[key]=1;
      var c=el('circle',{cx:p[0].toFixed(1),cy:p[1].toFixed(1),r:(s.signed?5:4)*Math.max(k,.35)*(view==='world'?1:1.2),fill:s.signed?'#177A4A':'#E9A23B','fill-opacity':.8,stroke:s.signed?'#0d5233':'#143059','stroke-width':.5*Math.max(k,.35)});
      var t=document.createElementNS(ns,'title');t.textContent=flag(s.country)+' '+loc(s)+' · '+(s.src||'direct')+' · '+when(s.t)+(s.signed?' · signed up':'');c.appendChild(t);
    });
    return svg;
  }

  // ---- generic UI helpers built on the host's h() ----
  function X(c){
    var h=c.h,S=c.S;
    function chip(label,on,fn){return h('button',{type:'button',class:'aa-b'+(on?' on':''),onclick:fn,text:label})}
    function table(heads,rows){
      var t=h('table',{class:'tbl'},[h('tr',{},heads.map(function(x){return h('th',{text:x})}))]);
      rows.forEach(function(r){t.appendChild(h('tr',{},r.map(function(x){return typeof x==='object'&&x&&x.nodeType?x:h('td',{text:esc(x)})})))});
      return h('div',{class:'scroll'},[t]);
    }
    function td(text,fn){var e=h('td',{text:text});if(fn){e.style.cursor='pointer';e.style.textDecoration='underline';e.onclick=fn}return e}
    var api={};

    // ================= OVERVIEW EXTRAS =================
    api.overview=function(ss,ev,prevSs){
      var out=[];
      // hourly chart
      var hours=Math.min(S.days*24,72),now=Date.now(),start=Math.floor(now/HR)*HR-(hours-1)*HR,buck=[];
      for(var i=0;i<hours;i++)buck.push(0);
      ss.forEach(function(s){var i=Math.floor((s.t-start)/HR);if(i>=0&&i<hours)buck[i]++});
      out.push(c.sec('Visits per hour (last '+hours+' hours)',[barChart(buck.map(function(n,i){return {n:n,label:new Date(start+i*HR).toLocaleString(undefined,{weekday:'short',hour:'numeric'})}}))],'Each bar is one hour in your local time. Hover for the exact hour.'));
      // weekday x hour grid
      var g=[];for(var d=0;d<7;d++){g.push([]);for(var hh=0;hh<24;hh++)g[d].push(0)}
      ss.forEach(function(s){var D=new Date(s.t);g[(D.getDay()+6)%7][D.getHours()]++});
      out.push(c.sec('Busiest times',[grid(g)],'Darker means more visits. Rows are weekdays, columns are hours in your local time.'));
      // daily with moving average handled in overview chart; new vs returning
      var nv=ss.filter(function(s){return s.nv}).length;
      out.push(h('div',{class:'aa-grid'},[
        c.sec('New and returning',[c.bars([{name:'New visitors',n:nv},{name:'Returning',n:ss.length-nv}],'n',ss.length)]),
        c.sec('Entry pages',[c.bars(top(ss,function(s){return s.entry}),'n',ss.length)],'Where visits start.'),
        c.sec('Exit pages',[c.bars(top(ss,function(s){return s.exit}),'n',ss.length)],'Last page seen in a visit.'),
        c.sec('Visit length',[c.bars(durBuckets(ss),'n',ss.length)]),
        c.sec('Pages per visit',[c.bars(pageBuckets(ss),'n',ss.length)]),
        c.sec('Opened from an app',[c.bars(top(ss,function(s){return /app$/.test(s.browser||'')?s.browser:'Normal browser'}),'n',ss.length)],'Facebook and Instagram apps are a strong sign someone came from a post.')
      ]));
      out.push(c.sec('Who signs up',[table(['Group','Visits','Signed up','Conversion'],convRows(ss))],'Signup rate by device, country and source.'));
      return out;
    };
    function top(ss,f,lim){var m={};ss.forEach(function(s){var k=f(s);if(k==null||k==='')return;m[k]=(m[k]||0)+1});return Object.keys(m).map(function(k){return {name:k,n:m[k]}}).sort(function(a,b){return b.n-a.n}).slice(0,lim||10)}
    function durBuckets(ss){var b=[['Under 10s',0,1e4],['10 to 30s',1e4,3e4],['30s to 2m',3e4,12e4],['2 to 5m',12e4,3e5],['Over 5m',3e5,1e12]];return b.map(function(x){return {name:x[0],n:ss.filter(function(s){return s.dur>=x[1]&&s.dur<x[2]}).length}})}
    function pageBuckets(ss){return [1,2,3,4].map(function(n){return {name:n===4?'4 or more':n+(n===1?' page':' pages'),n:ss.filter(function(s){return n===4?s.pages>=4:s.pages===n}).length}})}
    function convRows(ss){
      var rows=[];
      [['Device',function(s){return s.device||'Unknown'}],['Country',function(s){return s.country?flag(s.country)+' '+s.country:'Unknown'}],['Source',function(s){return s.src}]].forEach(function(g){
        var m={};ss.forEach(function(s){var k=g[1](s),r=m[k]||(m[k]={n:0,s:0});r.n++;if(s.signed)r.s++});
        Object.keys(m).sort(function(a,b){return m[b].n-m[a].n}).slice(0,6).forEach(function(k){rows.push([g[0]+': '+k,String(m[k].n),String(m[k].s),pct(m[k].s,m[k].n)+'%'])});
      });
      return rows;
    }
    function barChart(rows,color){
      var W=720,H=120,max=Math.max.apply(null,rows.map(function(r){return r.n}).concat([1])),bw=W/rows.length,ns='http://www.w3.org/2000/svg',s=document.createElementNS(ns,'svg');
      s.setAttribute('viewBox','0 0 '+W+' '+(H+16));s.setAttribute('class','aa-chart');
      rows.forEach(function(r,i){var e=document.createElementNS(ns,'rect');e.setAttribute('x',i*bw+1);e.setAttribute('width',Math.max(1,bw-2));var hh=r.n/max*H;e.setAttribute('y',H-hh);e.setAttribute('height',hh);e.style.fill=color||'var(--accent)';var t=document.createElementNS(ns,'title');t.textContent=r.label+': '+r.n+' visits';e.appendChild(t);s.appendChild(e)});
      var t=document.createElementNS(ns,'text');t.setAttribute('x',0);t.setAttribute('y',10);t.setAttribute('font-size',11);t.setAttribute('fill','#556070');t.textContent='peak '+max;s.appendChild(t);
      return s;
    }
    function grid(g){
      var mx=1;g.forEach(function(r){r.forEach(function(n){if(n>mx)mx=n})});
      var days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],box=h('div',{class:'scroll'}),t=document.createElement('table');t.style.cssText='border-collapse:collapse;font-size:.75rem';
      var hr=document.createElement('tr');hr.appendChild(document.createElement('td'));for(var i=0;i<24;i++){var th=document.createElement('td');th.textContent=i%3===0?i:'';th.style.cssText='text-align:center;color:#556070;min-width:1.5rem';hr.appendChild(th)}t.appendChild(hr);
      g.forEach(function(r,d){var tr=document.createElement('tr'),l=document.createElement('td');l.textContent=days[d];l.style.cssText='padding-right:.5rem;color:#556070';tr.appendChild(l);
        r.forEach(function(n,hh){var td=document.createElement('td');td.title=days[d]+' '+hh+':00 · '+n+' visits';td.style.cssText='height:1.5rem;min-width:1.5rem;border:1px solid #fff;background:'+(n?'rgba(20,48,89,'+(.12+.88*n/mx).toFixed(2)+')':'#F2EDE3');tr.appendChild(td)});t.appendChild(tr)});
      box.appendChild(t);return box;
    }

    // ================= LOCATIONS =================
    var L={by:'country',sort:'n',dir:-1,q:'',view:'world',metric:'n'};
    api.locations=function(ss,rerender){
      var out=[];
      var mapBox=h('div',{class:'aa-mapbox'});
      function drawMap(){mapBox.textContent='';mapBox.appendChild(mapSvg(ss,L.view))}
      out.push(c.sec('Where everyone is',[
        h('div',{class:'aa-ctl'},[['world','World'],['usa','United States'],['europe','Europe']].map(function(v){return chip(v[1],L.view===v[0],function(){L.view=v[0];rerender()})})),
        mapBox,
        h('p',{class:'fine',text:'One dot per visitor. Green dots signed up. Dots sit at the visitor’s city (found with a free lookup the first time, then remembered) or at the middle of their country when the city is unknown. Hover a dot for details.'})
      ]));
      drawMap();geocode(ss,drawMap);
      // table
      var key={country:function(s){return s.country||'Unknown'},region:function(s){return s.region?s.region+(s.country?', '+s.country:''):'Unknown'},city:function(s){return s.city?s.city+(s.region?', '+s.region:'')+(s.country?', '+s.country:''):'Unknown'}}[L.by];
      var m={};
      ss.forEach(function(s){var k=key(s),r=m[k]||(m[k]={name:k,country:s.country,n:0,v:{},j:0,g:0,dur:0,dn:0,b:0});r.n++;r.v[s.vid]=1;if(s.joined)r.j++;if(s.signed)r.g++;if(s.dur>0){r.dur+=s.dur;r.dn++}if(s.pages<=1)r.b++});
      var rows=Object.keys(m).map(function(k){var r=m[k];return {name:r.name,country:r.country,n:r.n,v:Object.keys(r.v).length,j:r.j,g:r.g,conv:r.n?r.g/r.n:0,avg:r.dn?r.dur/r.dn:0,bounce:r.n?r.b/r.n:0}});
      if(L.q)rows=rows.filter(function(r){return r.name.toLowerCase().indexOf(L.q.toLowerCase())>-1});
      rows.sort(function(a,b){var x=a[L.sort],y=b[L.sort];return (typeof x==='string'?x.localeCompare(y):x-y)*L.dir||b.n-a.n});
      var heads=[['name','Place'],['n','Visits'],['v','Visitors'],['j','Opened join'],['g','Signed up'],['conv','Signup rate'],['avg','Avg. time'],['bounce','Left after one page']];
      var t=h('table',{class:'tbl'},[h('tr',{},heads.map(function(x){var th=h('th',{text:x[1]+(L.sort===x[0]?(L.dir<0?' ▼':' ▲'):''),style:'cursor:pointer'});th.onclick=function(){if(L.sort===x[0])L.dir=-L.dir;else{L.sort=x[0];L.dir=x[0]==='name'?1:-1}rerender()};return th}))]);
      rows.slice(0,200).forEach(function(r){t.appendChild(h('tr',{},[h('td',{text:flag(r.country)+' '+r.name}),h('td',{text:String(r.n)}),h('td',{text:String(r.v)}),h('td',{text:String(r.j)}),h('td',{text:String(r.g)}),h('td',{text:Math.round(r.conv*1000)/10+'%'}),h('td',{text:r.avg?fmtT(r.avg):'-'}),h('td',{text:Math.round(r.bounce*100)+'%'})]))});
      var q=h('input',{type:'search',placeholder:'Search places',value:L.q,'aria-label':'Search places'});q.style.cssText='font:inherit;min-height:2.4rem;padding:.2rem .6rem;border:1px solid var(--line);border-radius:8px';
      q.onchange=function(){L.q=q.value;rerender()};
      out.push(c.sec('Organize by place',[
        h('div',{class:'aa-ctl'},[chip('Countries',L.by==='country',function(){L.by='country';rerender()}),chip('States and regions',L.by==='region',function(){L.by='region';rerender()}),chip('Cities',L.by==='city',function(){L.by='city';rerender()}),q,h('button',{type:'button',class:'aa-b',text:'Download CSV',onclick:function(){download('riside-locations.csv',csv(rows,['name','n','v','j','g','conv','avg','bounce']))}})]),
        h('div',{class:'scroll'},[t]),
        h('p',{class:'fine',text:'Click a column heading to sort. '+rows.length+' places.'})
      ]));
      return out;
    };

    // ================= REPLAYS =================
    var R=window.__AAR||(window.__AAR={filter:'all',open:null});
    api.replays=function(ss,rerender){
      var out=[],list=ss.slice();
      var RM=R.recs||{};if(!R.recs&&!R.loading){R.loading=1;recList().then(function(m){R.recs=m;R.loading=0;rerender()})}
      if(R.filter==='rec')list=list.filter(function(s){return RM[s.sid]});
      if(R.filter==='signed')list=list.filter(function(s){return s.signed});
      else if(R.filter==='deep')list=list.filter(function(s){return s.pages>=3});
      else if(R.filter==='long')list=list.slice().sort(function(a,b){return b.dur-a.dur});
      else if(R.filter==='mobile')list=list.filter(function(s){return s.device==='mobile'});
      else if(R.filter==='clicks')list=list.filter(function(s){return s.clicks>0});
      if(R.filter!=='long')list.sort(function(a,b){return b.t-a.t});
      var player=h('div',{class:'aa-player'});
      var fl=[['rec','Recorded'],['all','All'],['clicks','With clicks'],['deep','3+ pages'],['signed','Signed up'],['long','Longest first'],['mobile','Phones']];
      out.push(c.sec('Session replays',[
        h('p',{class:'fine',text:'Visits marked ● Recorded play back exactly as the person saw it (mouse, scrolling, taps). Typing is always hidden. Older visits without a recording show an approximate replay built from page views and clicks.'}),
        h('div',{class:'aa-ctl'},fl.map(function(f){return chip(f[1],R.filter===f[0],function(){R.filter=f[0];rerender()})})),
        player,
        table(['When','Rec','Where','Device','Source','Pages','Clicks','Time','Result',''],list.slice(0,150).map(function(s){return [when(s.t),RM[s.sid]?'●':'',flag(s.country)+' '+loc(s),(s.device||'')+(s.browser?' · '+s.browser:''),s.src,String(s.pages),String(s.clicks),s.dur?fmtT(s.dur):'-',s.signed?'Reserved a class':s.joined?'Opened join':'',td('▶ Watch',function(){R.open=s.sid;openPlayer(s,player);player.scrollIntoView({behavior:'smooth',block:'start'})})]})),
        h('p',{class:'fine',text:'Showing the latest '+Math.min(150,list.length)+' of '+list.length+' visits.'})
      ]));
      if(R.open){var s0=ss.filter(function(s){return s.sid===R.open})[0];openPlayer(s0||{sid:R.open},player);setTimeout(function(){player.scrollIntoView({block:'start'})},50)}
      return out;
    };
    api.openReplay=function(sid){R.open=sid};

    function route(path){return path.indexOf('/guides/')===0||path.indexOf('/ai-classes/')===0?path+'?notrack':'/?notrack#'+(path==='/'?'':path.slice(1))}
    // Real recordings (rrweb). Falls back to the approximate replay when a visit has no recording.

    function recList(){
      if(window.__AARECS)return window.__AARECS;var RECS;
      RECS=c.api('/rest/v1/replay_chunks?select=sid&order=id.desc&limit=5000',{token:c.tok}).then(function(r){return r.ok?r.json():[]}).then(function(rows){var m={};rows.forEach(function(x){m[x.sid]=1});return m}).catch(function(){return {}});
      try{c.api('/rest/v1/rpc/replay_cleanup',{method:'POST',token:c.tok,body:{}}).catch(function(){})}catch(e){}
      return (window.__AARECS=RECS);
    }
    api.recList=recList;
    function loadFile(tag,src){return new Promise(function(ok,no){if(document.querySelector('[data-rr="'+src+'"]'))return ok();var e=document.createElement(tag);e.setAttribute('data-rr',src);if(tag==='link'){e.rel='stylesheet';e.href=src}else{e.src=src}e.onload=ok;e.onerror=no;document.head.appendChild(e)})}
    function decode(rows){
      // multi-part rows share a seq: join them in part order
      var bySeq={};rows.forEach(function(r){if(r.parts>1){(bySeq[r.seq]=bySeq[r.seq]||[]).push(r)}});
      var singles=rows.filter(function(r){return !(r.parts>1)}).map(function(r){return r.data});
      Object.keys(bySeq).forEach(function(k){var a=bySeq[k].sort(function(x,y){return x.part-y.part});if(a.length===a[0].parts)singles.push(a.map(function(r){return r.data}).join(''))});
      return Promise.all(singles.map(function(d){
        if(d.slice(0,2)==='j:')return Promise.resolve(JSON.parse(d.slice(2)));
        var bin=atob(d.slice(2)),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
        return new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text().then(JSON.parse);
      })).then(function(parts){var ev=[].concat.apply([],parts);ev.sort(function(a,b){return a.timestamp-b.timestamp});return ev});
    }
    function openPlayer(s,box){
      box.textContent='';
      var wait=h('p',{class:'fine',text:'Loading recording.'});box.appendChild(wait);
      c.api('/rest/v1/replay_chunks?select=id,seq,part,parts,data&sid=eq.'+encodeURIComponent(s.sid)+'&order=seq,part,id',{token:c.tok}).then(function(r){return r.ok?r.json():[]}).then(function(rows){
        if(!rows.length){approxPlayer(s,box);return}
        return Promise.all([loadFile('link','/vendor/rrweb/player.css'),loadFile('script','/vendor/rrweb/player.min.js')]).then(function(){return decode(rows)}).then(function(ev){
          box.textContent='';
          if(ev.length<2){approxPlayer(s,box);return}
          var pw=Math.min(box.parentNode&&box.parentNode.clientWidth||900,900),ph=Math.round(pw*0.62);
          var head=h('p',{class:'fine',text:'Real recording · '+(s.country?flag(s.country)+' '+loc(s)+' · ':'')+(s.device||'')+(s.browser?' · '+s.browser:'')+(s.t?' · '+when(s.t):'')+(s.src?' · came from '+s.src:'')+' · typing is hidden'});
          var target=h('div');var close=h('button',{type:'button',class:'aa-b',text:'Close',onclick:function(){R.open=null;box.textContent=''}});
          var approx=h('button',{type:'button',class:'aa-b',text:'Show step list instead',onclick:function(){approxPlayer(s,box)}});
          box.appendChild(h('div',{style:'border:1px solid var(--line);border-radius:12px;padding:1rem;margin-bottom:1rem;background:var(--tint)'},[head,target,h('div',{class:'aa-ctl',style:'margin-top:.6rem'},[close].concat(s.ev?[approx]:[]))]));
          var P=window.rrwebPlayer.Player||window.rrwebPlayer.default||window.rrwebPlayer;
          new P({target:target,props:{events:ev,width:pw,height:ph,autoPlay:true,skipInactive:true,speedOption:[1,2,4,8],showController:true,mouseTail:{strokeStyle:'#E9A23B'}}});
        });
      }).catch(function(){approxPlayer(s,box)});
    }
    function approxPlayer(s,box){
      box.textContent='';
      if(!s.ev){box.appendChild(h('p',{class:'fine',text:'No recording for this visit.'}));return}
      // timeline: segments per view
      var ev=s.ev,t0=ev[0]?+new Date(ev[0].created_at):s.t,segs=[],cur=null;
      ev.forEach(function(e){
        var t=+new Date(e.created_at);
        if(e.type==='view'){cur={path:e.path,start:t,clicks:[],depth:0,dur:0};segs.push(cur)}
        else if(cur&&e.type==='click')cur.clicks.push(e);
        else if(cur&&e.type==='scroll'&&e.path===cur.path){cur.depth=e.depth||0;cur.dur=e.dur||0;cur.endTs=t}
      });
      // virtual time: each segment lasts its dur (min 2s, max 60s), clicks spread across it
      var vt=0;segs.forEach(function(sg){
        var len=Math.max(3000,Math.min(sg.dur||0,60000));sg.v0=vt;sg.len=len;vt+=len;
        var n=sg.clicks.length;
        sg.clicks.forEach(function(e,i){e.vt=sg.v0+Math.round(len*(n===1?.5:.15+.7*i/(n-1)))});
      });
      var total=vt||1,vw=s.vw||1200,vh=s.vh||800,pw=Math.min(box.parentNode&&box.parentNode.clientWidth||720,720);
      var k=pw/vw,H=Math.round(vh*k);
      var head=h('p',{class:'fine',text:flag(s.country)+' '+loc(s)+' · '+(s.device||'')+' · '+(s.browser||'')+' · '+when(s.t)+' · came from '+s.src+' · '+s.pages+' pages, '+s.clicks+' clicks'+(s.signed?' · reserved a class':'')});
      var view=h('div',{class:'aa-box'}),stage=h('div'),fr=document.createElement('iframe'),mark=h('div');
      view.style.cssText='width:'+pw+'px;height:'+H+'px;max-width:100%;background:#fff';
      stage.style.cssText='position:absolute;left:0;top:0;width:'+vw+'px;transform-origin:0 0;transform:scale('+k+');will-change:transform';
      fr.style.cssText='width:'+vw+'px;height:3000px;border:0;display:block;pointer-events:none';fr.setAttribute('tabindex','-1');fr.setAttribute('aria-hidden','true');fr.title='Page preview';
      mark.style.cssText='position:absolute;inset:0;pointer-events:none';
      stage.appendChild(fr);stage.appendChild(mark);view.appendChild(stage);
      var label=h('div',{class:'fine',text:''}),range=h('input',{type:'range',min:0,max:total,value:0,'aria-label':'Position'});range.style.width='100%';
      var playing=false,speed=1,pos=0,last=0,loadedPath=null,pageH=2000,raf=0;
      var bPlay=h('button',{type:'button',class:'aa-b',text:'▶ Play'});
      var sp=h('select',{'aria-label':'Speed'},[1,2,4,8].map(function(n){return h('option',{value:n,text:n+'x'})}));
      function segAt(v){var r=segs[0];segs.forEach(function(sg){if(v>=sg.v0)r=sg});return r}
      function render(){
        var sg=segAt(pos);if(!sg)return;
        if(loadedPath!==sg.path){loadedPath=sg.path;mark.textContent='';fr.onload=function(){setTimeout(function(){try{pageH=Math.max(vh,fr.contentDocument.documentElement.scrollHeight);fr.style.height=pageH+'px'}catch(e){pageH=Math.max(vh,(sg.clicks.reduce(function(a,e){return Math.max(a,e.y||0)},0))+600)}render()},700)};fr.src=route(sg.path)}
        var f=Math.max(0,Math.min(1,(pos-sg.v0)/sg.len)),finalTop=Math.max(0,(sg.depth/100)*pageH-vh),top=0;
        // keyframes: start 0, each click scrolls to show it, end finalTop
        var kf=[[0,0]];sg.clicks.forEach(function(e){kf.push([(e.vt-sg.v0)/sg.len,Math.max(0,Math.min(Math.max(finalTop,e.y-vh*.6),(e.y||0)-vh*.4))])});kf.push([1,Math.max(finalTop,kf[kf.length-1][1])]);
        for(var i=1;i<kf.length;i++){if(f<=kf[i][0]||i===kf.length-1){var a=kf[i-1],b=kf[i],u=b[0]===a[0]?1:Math.max(0,Math.min(1,(f-a[0])/(b[0]-a[0])));top=a[1]+(b[1]-a[1])*u;break}}
        top=Math.min(top,Math.max(0,pageH-vh));
        stage.style.transform='translateY('+(-top*k)+'px) scale('+k+')';
        mark.textContent='';
        sg.clicks.forEach(function(e){
          if(e.vt>pos)return;var age=pos-e.vt,x=(e.x||0)/1000*vw;
          var d=document.createElement('div');var r=16+Math.min(age,1500)/1500*14;
          d.style.cssText='position:absolute;left:'+(x-r)+'px;top:'+((e.y||0)-r)+'px;width:'+r*2+'px;height:'+r*2+'px;border-radius:50%;background:rgba(233,162,59,'+(age<1500?.6:.28)+');border:3px solid '+(age<1500?'#E9A23B':'rgba(20,48,89,.5)');
          mark.appendChild(d);
        });
        label.textContent=sg.path+' · '+fmtT(pos)+' of '+fmtT(total)+' (idle time skipped) · scrolled '+Math.round(Math.min(100,(top+vh)/pageH*100))+'%';
        range.value=pos;
      }
      function tick(ts){if(!playing)return;var dt=ts-last;last=ts;pos+=dt*speed;if(pos>=total){pos=total;playing=false;bPlay.textContent='↻ Replay'}render();if(playing)raf=requestAnimationFrame(tick)}
      bPlay.onclick=function(){if(playing){playing=false;bPlay.textContent='▶ Play';return}if(pos>=total)pos=0;playing=true;bPlay.textContent='❚❚ Pause';last=performance.now();raf=requestAnimationFrame(tick)};
      sp.onchange=function(){speed=+sp.value};
      range.oninput=function(){pos=+range.value;render()};
      var log=h('div',{class:'aa-log'});
      segs.forEach(function(sg){
        var r=h('div',{class:'fine'},[h('b',{text:'Opened '+sg.path+' '}),document.createTextNode('(scrolled '+sg.depth+'%, '+fmtT(sg.dur)+')')]);r.style.cursor='pointer';r.onclick=function(){pos=sg.v0;render()};log.appendChild(r);
        sg.clicks.forEach(function(e){var q=h('div',{class:'fine',text:'   clicked '+(e.el||'page')});q.style.cssText='cursor:pointer;margin-left:1rem';q.onclick=function(){pos=e.vt;render()};log.appendChild(q)});
      });
      var close=h('button',{type:'button',class:'aa-b',text:'Close',onclick:function(){cancelAnimationFrame(raf);playing=false;R.open=null;box.textContent=''}});
      box.appendChild(h('div',{style:'border:1px solid var(--line);border-radius:12px;padding:1rem;margin-bottom:1rem;background:var(--tint)'},[head,view,h('div',{class:'aa-ctl',style:'margin-top:.6rem'},[bPlay,sp,close]),range,label,log]));
      setTimeout(render,0);
    }

    // ================= RAW DATA =================
    var D={type:'all',q:'',page:0};
    api.raw=function(ev,ss,rerender){
      var out=[],rows=ev;
      if(D.type!=='all')rows=rows.filter(function(e){return e.type===D.type});
      if(D.q){var q=D.q.toLowerCase();rows=rows.filter(function(e){return [e.sid,e.vid,e.path,e.src,e.country,e.region,e.city,e.el,e.browser,e.os].join(' ').toLowerCase().indexOf(q)>-1})}
      var N=100,pages=Math.max(1,Math.ceil(rows.length/N));if(D.page>=pages)D.page=0;
      var qi=h('input',{type:'search',placeholder:'Search anything (city, page, source, session id)',value:D.q,'aria-label':'Search'});qi.style.cssText='font:inherit;min-height:2.4rem;padding:.2rem .6rem;border:1px solid var(--line);border-radius:8px;min-width:16rem';qi.onchange=function(){D.q=qi.value;D.page=0;rerender()};
      var sesCols=['sid','vid','t','country','region','city','device','browser','os','src','ref','camp','entry','exit','pages','clicks','depth','dur','joined','signed'];
      var sesRows=ss.map(function(s){var o={};sesCols.forEach(function(k){o[k]=s[k]});o.t=new Date(s.t).toISOString();return o});
      var evCols=['id','created_at','sid','vid','type','path','src','ref_host','utm_medium','utm_campaign','new_visitor','device','browser','os','vw','vh','country','region','city','depth','dur','x','y','el'];
      out.push(c.sec('Raw data',[
        h('div',{class:'aa-ctl'},[['all','All events'],['view','Page views'],['click','Clicks'],['scroll','Scrolls'],['signup','Signups']].map(function(t){return chip(t[1],D.type===t[0],function(){D.type=t[0];D.page=0;rerender()})}).concat([qi])),
        h('div',{class:'aa-ctl'},[
          h('button',{type:'button',class:'aa-b',text:'Download events (CSV)',onclick:function(){download('riside-events.csv',csv(rows,evCols))}}),
          h('button',{type:'button',class:'aa-b',text:'Download visits (CSV)',onclick:function(){download('riside-visits.csv',csv(sesRows,sesCols))}}),
          h('button',{type:'button',class:'aa-b',text:'Download everything (JSON)',onclick:function(){download('riside-analytics.json',JSON.stringify({events:ev,visits:sesRows},null,1),'application/json')}})]),
        h('p',{class:'fine',text:rows.length+' events match, newest first. Click a visit id to watch its replay.'}),
        table(['When','Type','Page','Where','Source','Device','Detail','Visit'],rows.slice().reverse().slice(D.page*N,D.page*N+N).map(function(e){
          var d=e.type==='click'?(e.el||'')+' @'+e.x+','+e.y:e.type==='scroll'?'scrolled '+e.depth+'% in '+fmtT(e.dur||0):e.type==='view'?(e.ref_host?'from '+e.ref_host:''):'';
          return [when(e.created_at),e.type,e.path||'',e.country?flag(e.country)+' '+[e.city,e.region].filter(Boolean).join(', '):'',e.src||'',[e.device,e.browser].filter(Boolean).join(' · '),d,td(String(e.sid).slice(0,8),function(){R.open=e.sid;S.tab='replays';rerender()})]})),
        h('div',{class:'aa-ctl'},[h('button',{type:'button',class:'aa-b',text:'◀ Newer',onclick:function(){D.page=Math.max(0,D.page-1);rerender()}}),h('span',{class:'fine',text:'Page '+(D.page+1)+' of '+pages}),h('button',{type:'button',class:'aa-b',text:'Older ▶',onclick:function(){D.page=Math.min(pages-1,D.page+1);rerender()}})])
      ]));
      return out;
    };

    // ================= TRAFFIC ATTRIBUTION =================
    var WIN={facebook:3,instagram:3,youtube:6,pinterest:12,other:3};
    var DEMO_KEY='aa_demo',POSTS_KEY='aa_posts';
    function readLS(k,d){try{return JSON.parse(localStorage.getItem(k)||'')||d}catch(e){return d}}
    var postsCache=null;
    function loadPosts(cb){
      if(postsCache)return cb(postsCache.concat(readLS(POSTS_KEY,[]).map(function(p){p.mine=true;return p})));
      fetch('/posts.json?'+Date.now()).then(function(r){return r.json()}).then(function(j){postsCache=j.posts||[]}).catch(function(){postsCache=[]}).then(function(){loadPosts(cb)});
    }
    var PLATFORMS=['youtube','facebook','instagram','pinterest'];
    function platformOf(s){
      var t=((s.src||'')+' '+(s.ref||'')).toLowerCase();
      if(/youtube|youtu\.be/.test(t))return 'youtube';
      if(/facebook|fb\.|^fb/.test(t)||s.browser==='Facebook app')return 'facebook';
      if(/instagram/.test(t)||s.browser==='Instagram app')return 'instagram';
      if(/pinterest|pin\.it/.test(t))return 'pinterest';
      return null;
    }
    function norm(o){var tot=0,k;for(k in o)tot+=o[k];var r={};for(k in o)r[k]=tot?o[k]/tot:0;return r}
    function similarity(a,b){var keys={},k,d=0;for(k in a)keys[k]=1;for(k in b)keys[k]=1;for(k in keys)d+=Math.abs((a[k]||0)-(b[k]||0));return 1-d/2}
    function parseDemo(txt){
      var o={country:{},device:{}};
      (txt||'').split('\n').forEach(function(l){
        var m=l.match(/^\s*(.+?)\s*[:\-=\t ]\s*([\d.]+)\s*%?\s*$/);if(!m)return;
        var name=m[1].trim(),v=parseFloat(m[2]);if(!(v>=0))return;
        var low=name.toLowerCase();
        if(low==='mobile'||low==='desktop'||low==='tablet'||low==='phone'||low==='computer')o.device[low==='phone'?'mobile':low==='computer'?'desktop':low]=v;
        else{if(low==='us'||low==='usa'||low==='u.s.')name='United States';if(low==='uk')name='United Kingdom';o.country[name]=v}
      });
      return o;
    }
    api.traffic=function(ss,rerender){
      var holder=h('div',{},[h('p',{class:'fine',text:'Loading posts.'})]);
      loadPosts(function(posts){holder.textContent='';traffic(holder,ss,posts,rerender)});
      return [holder];
    };
    function traffic(holder,ss,posts,rerender){
      var now=Date.now(),hours=Math.min(S.days*24,168),start=Math.floor(now/HR)*HR-(hours-1)*HR;
      posts=posts.filter(function(p){return +new Date(p.t)<=now&&+new Date(p.t)>=start-HR*6}).map(function(p){var pl=PLATFORMS.indexOf(p.platform)>-1?p.platform:'other';return {t:+new Date(p.t),platform:pl,label:p.label,mine:p.mine,id:p.t+p.label,scheduled:p.scheduled,win:(WIN[pl]||3)*HR}});
      // hourly buckets and window flags
      var buck=[],inWin=[];for(var i=0;i<hours;i++){buck.push(0);inWin.push(false)}
      posts.forEach(function(p){for(var t=Math.floor(p.t/HR)*HR;t<p.t+p.win;t+=HR){var i=Math.floor((t-start)/HR);if(i>=0&&i<hours)inWin[i]=true}});
      ss.forEach(function(s){var i=Math.floor((s.t-start)/HR);if(i>=0&&i<hours)buck[i]++});
      var base=0,nb=0;buck.forEach(function(n,i){if(!inWin[i]){base+=n;nb++}});
      var rate=nb?base/nb:(hours?buck.reduce(function(a,b){return a+b},0)/hours:0);
      // evidence classes
      var confirmed={},inferred={},organic=0,other=0;
      var winSessions=[];
      ss.forEach(function(s){
        var pf=platformOf(s);
        if(pf){confirmed[pf]=(confirmed[pf]||0)+1;s._cls='confirmed';s._pf=pf;return}
        if(/google|bing|duckduckgo|yahoo|ecosia/.test((s.src||'').toLowerCase())){organic++;s._cls='organic';return}
        var best=null;posts.forEach(function(p){if(s.t>=p.t&&s.t<p.t+p.win&&(!best||p.t>best.t))best=p});
        if(best&&(s.src==='direct'||!s.src)){inferred[best.platform]=(inferred[best.platform]||0)+1;s._cls='inferred';s._pf=best.platform;winSessions.push(s);return}
        other++;s._cls='other';
      });
      // per post lift
      var rows=posts.map(function(p){
        var inside=ss.filter(function(s){return s.t>=p.t&&s.t<p.t+p.win}),hrs=p.win/HR;
        var ov=posts.filter(function(q){return q!==p&&q.t<p.t+p.win&&q.t+q.win>p.t}).length+1;
        var exp=rate*hrs,obs=inside.length/ov,conf=inside.filter(function(s){return s._cls==='confirmed'&&s._pf===p.platform}).length;
        var lift=Math.max(0,Math.round((obs-exp)*10)/10);
        return {p:p,obs:Math.round(obs*10)/10,exp:Math.round(exp*10)/10,lift:lift,conf:conf,sign:inside.filter(function(s){return s.signed}).length,
          strength:lift>=3&&obs>=exp*2?'Strong':lift>=1.5?'Likely':lift>0.5?'Weak':'No visible bump'};
      });
      var byPf={};rows.forEach(function(r){var b=byPf[r.p.platform]||(byPf[r.p.platform]={posts:0,lift:0,conf:0,signed:0});b.posts++;b.lift+=r.lift;b.conf+=r.conf;b.signed+=r.sign});
      // chart with markers
      var ns='http://www.w3.org/2000/svg',W=760,H=140,P=24,svg=document.createElementNS(ns,'svg'),mx=Math.max.apply(null,buck.concat([2])),bw=(W-P)/hours;
      svg.setAttribute('viewBox','0 0 '+W+' '+(H+34));svg.setAttribute('class','aa-chart');
      function el(t,a,txt){var e=document.createElementNS(ns,t);for(var n in a)e.setAttribute(n,a[n]);if(txt){var tt=document.createElementNS(ns,'title');tt.textContent=txt;e.appendChild(tt)}svg.appendChild(e);return e}
      buck.forEach(function(n,i){var hh=n/mx*H;el('rect',{x:P+i*bw+.5,y:H-hh,width:Math.max(1,bw-1),height:hh,fill:inWin[i]?'#E9A23B':'#143059','fill-opacity':inWin[i]?.9:.7},new Date(start+i*HR).toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric'})+': '+n+' visits'+(inWin[i]?' (inside a post window)':''))});
      el('line',{x1:P,x2:W,y1:H-rate/mx*H,y2:H-rate/mx*H,stroke:'#B23A1E','stroke-dasharray':'4 3','stroke-width':1},'Normal level outside post windows: '+Math.round(rate*100)/100+' visits per hour');
      posts.forEach(function(p){var x=P+((p.t-start)/HR)*bw;if(x<P)return;el('line',{x1:x,x2:x,y1:0,y2:H+10,stroke:COL[p.platform],'stroke-width':2},p.platform+': '+p.label+' · '+when(p.t));el('circle',{cx:x,cy:H+16,r:4,fill:COL[p.platform]},p.platform+': '+p.label+' · '+when(p.t))});
      var tx=el('text',{x:0,y:10,'font-size':11,fill:'#556070'});tx.textContent=String(mx);
      var legend=h('p',{class:'fine',text:'Dark bars are visits per hour. Amber bars fall inside a post’s window. Colored lines mark when a post went live (hover them). The red dashed line is the normal level between posts: '+(Math.round(rate*100)/100)+' visits an hour.'});
      var out=[];
      out.push(c.sec('Visits and posts on one timeline',[svg,legend]));
      // evidence
      var ev=[{name:'Confirmed (link, app or referrer says so)',n:Object.keys(confirmed).reduce(function(a,k){return a+confirmed[k]},0)},{name:'Inferred (arrived with no link right after a post)',n:Object.keys(inferred).reduce(function(a,k){return a+inferred[k]},0)},{name:'Search engines',n:organic},{name:'Unexplained',n:other}];
      out.push(c.sec('How each visit was explained',[c.bars(ev,'n',ss.length)],'Most people never click a tracked link, so a visit that appears with no referrer in the hours after a post is counted as likely from that post.'));
      var pfRows=Object.keys(byPf).map(function(k){var b=byPf[k];return [k.charAt(0).toUpperCase()+k.slice(1),String(b.posts),String(Math.round(b.lift*10)/10),String((confirmed[k]||0)),String(inferred[k]||0),String(b.signed)]}).sort(function(a,b){return parseFloat(b[2])-parseFloat(a[2])});
      out.push(c.sec('Which platform drives traffic',[table(['Platform','Posts','Extra visits above normal','Confirmed visits','Inferred visits','Signups in windows'],pfRows)],'Extra visits = visits inside post windows minus what the normal level would give. Windows: Facebook and Instagram 3 hours, YouTube 6, Pinterest 12.'));
      var postRows=rows.slice().sort(function(a,b){return b.lift-a.lift}).map(function(r){return [when(r.p.t),r.p.platform,r.p.label+(r.p.scheduled?' (scheduled time)':''),String(r.obs),String(r.exp),String(r.lift),String(r.conf),r.strength,r.p.mine?td('remove',function(){var l=readLS(POSTS_KEY,[]).filter(function(x){return x.t!==new Date(r.p.t).toISOString()||x.label!==r.p.label});localStorage.setItem(POSTS_KEY,JSON.stringify(l));rerender()}):'']});
      out.push(c.sec('Which posts and videos worked',[postRows.length?table(['Posted','Platform','Post','Visits in window','Expected','Extra visits','Confirmed','Signal',''],postRows):h('p',{class:'fine',text:'No posts in this period.'})],'Sorted by extra visits. Posts close together share credit, so treat results as hints, not proof.'));
      // add post form
      var pf=h('select',{'aria-label':'Platform'},PLATFORMS.concat(['other']).map(function(p){return h('option',{value:p,text:p})})),dt=h('input',{type:'datetime-local','aria-label':'Posted at'}),lb=h('input',{type:'text',placeholder:'What was posted',maxlength:80,'aria-label':'What was posted'});
      [pf,dt,lb].forEach(function(e){e.style.cssText='font:inherit;min-height:2.4rem;padding:.2rem .6rem;border:1px solid var(--line);border-radius:8px'});
      out.push(c.sec('Add a post',[h('div',{class:'aa-ctl'},[pf,dt,lb,h('button',{type:'button',class:'aa-b',text:'Add',onclick:function(){if(!dt.value||!lb.value)return;var l=readLS(POSTS_KEY,[]);l.push({t:new Date(dt.value).toISOString(),platform:pf.value,label:lb.value});localStorage.setItem(POSTS_KEY,JSON.stringify(l));rerender()}})]),h('p',{class:'fine',text:'Posts from the posting log load automatically. Add any others here (saved in this browser).'})]));
      // demographics
      var demo=readLS(DEMO_KEY,{});
      var grid=h('div',{class:'aa-grid'});
      var cohort={all:cohortOf(ss)};
      PLATFORMS.forEach(function(p){
        var ta=h('textarea',{rows:6,placeholder:'United States 80\nCanada 9\nmobile 85\ndesktop 15','aria-label':p+' viewer breakdown'});ta.value=demo[p]||'';ta.style.cssText='width:100%;font:inherit;padding:.4rem;border:1px solid var(--line);border-radius:8px';
        ta.onchange=function(){demo[p]=ta.value;localStorage.setItem(DEMO_KEY,JSON.stringify(demo));rerender()};
        var parsed=parseDemo(demo[p]),has=Object.keys(parsed.country).length||Object.keys(parsed.device).length;
        var wsess=ss.filter(function(s){return s._pf===p&&(s._cls==='inferred'||s._cls==='confirmed')});
        var kids=[h('h3',{text:p.charAt(0).toUpperCase()+p.slice(1)+' viewers'}),ta];
        if(has){
          var site=cohortOf(ss),sp=cohortOf(wsess),line=[];
          if(Object.keys(parsed.country).length){line.push('Country match with all site visitors: '+Math.round(similarity(norm(parsed.country),site.country)*100)+'%');if(wsess.length>=5)line.push('with its '+wsess.length+' likely visits: '+Math.round(similarity(norm(parsed.country),sp.country)*100)+'%')}
          if(Object.keys(parsed.device).length){line.push('Device match: '+Math.round(similarity(norm(parsed.device),site.device)*100)+'%')}
          kids.push(h('p',{class:'fine',text:line.join(' · ')}));
        }
        grid.appendChild(h('div',{},kids));
      });
      // best-match table
      var summary=[];
      PLATFORMS.forEach(function(p){var parsed=parseDemo(demo[p]);if(!Object.keys(parsed.country).length)return;var best=null;PLATFORMS.forEach(function(q){var w=ss.filter(function(s){return s._pf===q&&s._cls!=='organic'});if(w.length<5)return;var sc=similarity(norm(parsed.country),cohortOf(w).country);if(!best||sc>best.sc)best={q:q,sc:sc,n:w.length}});if(best)summary.push([p,best.q,Math.round(best.sc*100)+'%',String(best.n)])});
      out.push(c.sec('Compare viewers with website visitors',[
        h('p',{class:'fine',text:'Paste each platform’s audience numbers from its own analytics (YouTube Studio > Audience, Meta Insights > Audience). One line per item, like “United States 78”. Lines named mobile, desktop or tablet count as devices. The match score is 100% when the two audiences look identical.'}),
        grid,
        summary.length?table(['Platform audience','Website visitors it matches best','Match','Visits compared'],summary):h('p',{class:'fine',text:'Add audience numbers above to see which platform’s viewers look like your website visitors. Saved in this browser.'})
      ]));
      var who=ss.filter(function(s){return s._cls==='inferred'||s._cls==='confirmed'});
      out.push(c.sec('Who the post-driven visitors are',[h('div',{class:'aa-grid'},[c.sec('Countries',[c.bars(top(who,function(s){return s.country?flag(s.country)+' '+s.country:'Unknown'}),'n',who.length)]),c.sec('Devices',[c.bars(top(who,function(s){return s.device||'Unknown'}),'n',who.length)]),c.sec('Apps and browsers',[c.bars(top(who,function(s){return s.browser}),'n',who.length)])])],'Confirmed and inferred visits only.'));
      out.forEach(function(n){holder.appendChild(n)});
    }
    function cohortOf(ss){var c1={},d1={};ss.forEach(function(s){if(s.country)c1[s.country]=(c1[s.country]||0)+1;if(s.device)d1[s.device]=(d1[s.device]||0)+1});return {country:norm(c1),device:norm(d1)}}

    api.flag=flag;
    return api;
  }
  window.AAX=X;window.AAXU={sessions:sessions,flag:flag,csv:csv,download:download};
})();
