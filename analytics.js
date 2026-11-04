/* Admin > Analytics tab. Loaded only when the tab is opened. */
(function(){
  var S={days:7,path:'/',mobile:false,real:true};
  var $$=function(n){return n.toLocaleString()};
  var CSS='.aa-ctl{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1.2rem}.aa-b{min-height:2.4rem;padding:.3rem .9rem;font-size:.95rem;background:#fff;color:var(--ink);border:1px solid var(--line)}.aa-b:hover{background:var(--tint)}.aa-b.on{background:var(--accent);color:#fff;border-color:var(--accent)}.aa-ctl select{font:inherit;min-height:2.4rem;padding:.2rem .6rem;border:1px solid var(--line);border-radius:8px;background:#fff}.aa-sec{margin-bottom:2rem}.aa-sec h3{margin:0 0 .4rem}.aa-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(18rem,1fr));gap:0 2rem}.aa-row{display:grid;grid-template-columns:minmax(5rem,9rem) 1fr auto;gap:.6rem;align-items:center;padding:.25rem 0;font-size:.95rem}.aa-l{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.aa-t{background:var(--tint);border-radius:6px;height:.8rem;display:block}.aa-t i{display:block;height:100%;background:var(--accent);border-radius:6px}.aa-row b{font-size:.9rem;white-space:nowrap}.aa-chart{width:100%;height:auto;max-width:720px}.aa-hw{overflow-x:auto}.aa-box{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:10px;background:#fff}@media(max-width:600px){.aa-row{grid-template-columns:5.5rem 1fr auto}}';

  window.AAdraw=function(m,c){
    var h=c.h;
    if(!document.getElementById('aa-css')){var st=document.createElement('style');st.id='aa-css';st.textContent=CSS;document.head.appendChild(st)}
    try{localStorage.setItem('no_track','1')}catch(e){}  // keep the owner's own visits out of the numbers
    function rpc(fn,body){return c.api('/rest/v1/rpc/'+fn,{token:c.tok,method:'POST',body:body}).then(function(r){if(!r.ok)throw r.status;return r.json()})}
    function sec(t,kids,hint){return h('section',{class:'aa-sec'},[h('h3',{text:t}),hint?h('p',{class:'fine',text:hint}):null].concat(kids))}
    function bars(rows,key,total){
      if(!rows||!rows.length)return h('p',{class:'fine',text:'Nothing yet.'});
      var max=Math.max.apply(null,rows.map(function(r){return r[key||'n']}));
      return h('div',{class:'aa-bars'},rows.map(function(r){var n=r[key||'n'];return h('div',{class:'aa-row'},[h('span',{class:'aa-l',text:r.name}),h('span',{class:'aa-t'},[h('i',{style:'width:'+Math.max(2,n/max*100)+'%'})]),h('b',{text:$$(n)+(total?' ('+Math.round(n/total*100)+'%)':'')})])}));
    }
    function chart(daily){
      var W=720,H=150,P=22,max=Math.max.apply(null,daily.map(function(d){return d.views}).concat([1])),bw=(W-P)/daily.length;
      var ns='http://www.w3.org/2000/svg',s=document.createElementNS(ns,'svg');s.setAttribute('viewBox','0 0 '+W+' '+(H+20));s.setAttribute('class','aa-chart');s.setAttribute('role','img');s.setAttribute('aria-label','Page views and visits per day');
      function r(x,y,w,hh,f,t){var e=document.createElementNS(ns,'rect');e.setAttribute('x',x);e.setAttribute('y',y);e.setAttribute('width',w);e.setAttribute('height',Math.max(hh,0));e.style.fill=f;e.setAttribute('rx',2);if(t){var tt=document.createElementNS(ns,'title');tt.textContent=t;e.appendChild(tt)}s.appendChild(e)}
      daily.forEach(function(d,i){var x=P+i*bw+bw*.12,w=bw*.76,hv=d.views/max*H,hs=d.sessions/max*H;r(x,H-hv,w,hv,'color-mix(in srgb,var(--accent) 35%,#fff)',d.d+': '+d.views+' views');r(x,H-hs,w,hs,'var(--accent)',d.d+': '+d.sessions+' visits')});
      function tx(x,y,t,a){var e=document.createElementNS(ns,'text');e.setAttribute('x',x);e.setAttribute('y',y);e.setAttribute('font-size',11);e.setAttribute('fill','#556070');if(a)e.setAttribute('text-anchor',a);e.textContent=t;s.appendChild(e)}
      tx(0,10,String(max));tx(P,H+14,daily[0].d.slice(5));tx(W,H+14,daily[daily.length-1].d.slice(5),'end');
      return s;
    }
    function funnel(f){
      var steps=[['Visits',f.sessions],['Opened the join page',f.joined],['Reserved a free class',f.signed]];
      var rows=steps.map(function(s,i){var p=i?(steps[i-1][1]?Math.round(s[1]/steps[i-1][1]*100):0):100;return {name:s[0],n:s[1],pct:p}});
      var top=Math.max(f.sessions,1);
      return h('div',{},[h('div',{class:'aa-bars'},rows.map(function(r,i){return h('div',{class:'aa-row'},[h('span',{class:'aa-l',text:r.name}),h('span',{class:'aa-t'},[h('i',{style:'width:'+Math.max(2,r.n/top*100)+'%'})]),h('b',{text:$$(r.n)+(i?' ('+r.pct+'% of previous)':'')})])})),
        h('p',{class:'fine',text:'In this period the database holds '+$$(f.signups_total)+' free-class signups. Paying members right now: '+$$(f.members_total)+'. Paid sign-ups are added by hand, so they cannot be matched to a visit yet.'})]);
    }
    function srcTable(rows){
      if(!rows.length)return h('p',{class:'fine',text:'Nothing yet.'});
      var t=h('table',{class:'tbl'},[h('tr',{},['Source','Visits','Opened join','Signed up','Conversion'].map(function(x){return h('th',{text:x})}))]);
      rows.forEach(function(r){t.appendChild(h('tr',{},[h('td',{text:r.name}),h('td',{text:$$(r.sessions)}),h('td',{text:$$(r.joined)}),h('td',{text:$$(r.signed)}),h('td',{text:r.sessions?(Math.round(r.signed/r.sessions*1000)/10)+'%':'0%'})]))});
      return h('div',{class:'scroll'},[t]);
    }
    function pagesTable(rows){
      if(!rows.length)return h('p',{class:'fine',text:'Nothing yet.'});
      var t=h('table',{class:'tbl'},[h('tr',{},['Page','Views','Avg. scrolled','Reached halfway','Reached the end','Avg. time'].map(function(x){return h('th',{text:x})}))]);
      rows.forEach(function(r){t.appendChild(h('tr',{},[h('td',{text:r.name}),h('td',{text:$$(r.views)}),h('td',{text:r.avg_depth+'%'}),h('td',{text:r.reach50+'%'}),h('td',{text:r.reach90+'%'}),h('td',{text:r.avg_sec+'s'})]))});
      return h('div',{class:'scroll'},[t]);
    }
    function recentTable(rows){
      if(!rows.length)return h('p',{class:'fine',text:'Nothing yet.'});
      var t=h('table',{class:'tbl'},[h('tr',{},['When','From','Where','Device','Pages','Result'].map(function(x){return h('th',{text:x})}))]);
      rows.forEach(function(r){var loc=[r.city,r.region,r.country].filter(Boolean).join(', ')||'Unknown';
        t.appendChild(h('tr',{},[h('td',{text:new Date(r.t).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}),h('td',{text:r.src}),h('td',{text:loc}),h('td',{text:(r.device||'')+(r.browser?' · '+r.browser:'')}),h('td',{text:String(r.pages)}),h('td',{text:r.signed?'Reserved a class':r.joined?'Opened join':''})]))});
      return h('div',{class:'scroll'},[t]);
    }
    function heat(pages){
      var paths=pages.map(function(p){return p.name});if(paths.indexOf(S.path)<0)S.path=paths[0]||'/';
      var out=h('div',{class:'aa-heat'}),sel=h('select',{'aria-label':'Page',onchange:function(){S.path=sel.value;load()}},paths.map(function(p){var o=h('option',{value:p,text:p});if(p===S.path)o.selected=true;return o}));
      var dev=h('select',{'aria-label':'Device',onchange:function(){S.mobile=dev.value==='m';load()}},[h('option',{value:'d',text:'Computer'}),h('option',{value:'m',text:'Phone'})]);dev.value=S.mobile?'m':'d';
      var info=h('p',{class:'fine',text:'Loading.'}),wrap=h('div',{class:'aa-hw'});
      function load(){
        info.textContent='Loading.';wrap.textContent='';
        Promise.resolve(localClicks()).then(function(r){
          if(!r.total){info.textContent='No clicks recorded for this page and device yet.';return}
          info.textContent=$$(r.total)+' clicks. Most clicked: '+(r.top.map(function(t){return t.name+' ('+t.n+')'}).join(', ')||'n/a');
          var W=S.mobile?390:1200,avail=Math.max(280,Math.min(wrap.parentNode.clientWidth||720,W)),k=avail/W;
          var fr=h('iframe',{src:'/?notrack#'+(S.path==='/'?'':S.path.slice(1)),title:'Page preview',scrolling:'no',tabindex:'-1','aria-hidden':'true'});
          fr.style.cssText='width:'+W+'px;height:2000px;border:0;transform:scale('+k+');transform-origin:0 0;pointer-events:none;display:block';
          var box=h('div',{class:'aa-box'},[fr]);box.style.width=avail+'px';
          var cv=document.createElement('canvas');cv.style.cssText='position:absolute;left:0;top:0;transform:scale('+k+');transform-origin:0 0;pointer-events:none';
          box.appendChild(cv);wrap.appendChild(box);
          fr.addEventListener('load',function(){setTimeout(function(){
            var H=2000;try{H=Math.max(600,fr.contentDocument.documentElement.scrollHeight)}catch(e){H=Math.max(1200,r.maxy+400)}
            fr.style.height=H+'px';box.style.height=H*k+'px';cv.width=W;cv.height=H;paint(cv,r.pts,W);
          },900)});
        }).catch(function(){info.textContent='Could not load clicks.'});
      }
      function localClicks(){
        var bad=classify(DATA.ev),pts=[],tops={},maxy=0;
        DATA.ev.forEach(function(e){
          if(e.type!=='click'||e.path!==S.path||e.x==null||e.y==null||((e.vw<700)!==!!S.mobile))return;
          if(S.real&&bad[e.sid])return;
          pts.push([e.x,e.y]);if(e.y>maxy)maxy=e.y;if(e.el)tops[e.el]=(tops[e.el]||0)+1});
        return {total:pts.length,maxy:maxy,pts:pts.slice(0,5000),top:Object.keys(tops).map(function(k){return {name:k,n:tops[k]}}).sort(function(a,b){return b.n-a.n}).slice(0,10)};
      }
      function paint(cv,pts,W){
        var x=cv.getContext('2d'),rad=S.mobile?26:34;x.globalAlpha=1;
        pts.forEach(function(p){var px=p[0]/1000*W,g=x.createRadialGradient(px,p[1],0,px,p[1],rad);g.addColorStop(0,'rgba(0,0,0,0.22)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(px-rad,p[1]-rad,rad*2,rad*2)});
        var im=x.getImageData(0,0,cv.width,cv.height),d=im.data;
        for(var i=0;i<d.length;i+=4){var a=d[i+3];if(!a){continue}var t=Math.min(1,a/200),r,g,b;
          if(t<.5){r=0;g=Math.round(120+t*270);b=255-Math.round(t*400)}else{r=Math.round((t-.5)*510);g=255-Math.round((t-.5)*300);b=0}
          d[i]=r;d[i+1]=g;d[i+2]=b;d[i+3]=Math.min(210,40+a*1.2)}
        x.putImageData(im,0,0);
      }
      out.appendChild(h('div',{class:'aa-ctl'},[sel,dev]));out.appendChild(info);out.appendChild(wrap);
      setTimeout(load,0);return out;
    }

    // Real-vs-all filter. Bot = the data-center crawler signature; test = our own selftest/internal visits.
    function isBotRow(e){return e.city==='San Jose'&&e.os==='Android'&&e.device==='mobile'&&(e.vw===412||e.vw===1024)}
    function fetchEvents(){
      var cols='created_at,vid,sid,type,path,src,utm_campaign,new_visitor,device,browser,os,country,region,city,vw,depth,dur,x,y,el',since=new Date(Date.now()-S.days*864e5).toISOString(),all=[];
      function page(o){return c.api('/rest/v1/analytics_events?select='+cols+'&created_at=gte.'+encodeURIComponent(since)+'&order=id&limit=1000&offset='+o,{token:c.tok}).then(function(r){if(!r.ok)throw r.status;return r.json()}).then(function(j){all=all.concat(j);return(j.length===1000&&all.length<30000)?page(o+1000):all})}
      return page(0);
    }
    function classify(ev){
      var bad={};ev.forEach(function(e){if(isBotRow(e)||e.src==='selftest'||e.src==='internal')bad[e.sid]=1});
      return bad;
    }
    function top(ev,f,lim){var m={};ev.forEach(function(e){var k=f(e);if(k==null||k==='')return;m[k]=(m[k]||0)+1});return Object.keys(m).map(function(k){return {name:k,n:m[k]}}).sort(function(a,b){return b.n-a.n}).slice(0,lim||15)}
    function build(ev,j){
      var views=ev.filter(function(e){return e.type==='view'}),first={},fl={};
      views.forEach(function(e){if(!first[e.sid]||e.created_at<first[e.sid].created_at)first[e.sid]=e});
      ev.forEach(function(e){var f=fl[e.sid]||(fl[e.sid]={pages:0,joined:false,signed:false,dur:0});if(e.type==='view'){f.pages++;if(e.path==='/join')f.joined=true}if(e.type==='signup')f.signed=true;f.dur+=e.dur||0});
      var S2=Object.keys(first).map(function(k){var e=first[k],f=fl[k];return {sid:k,vid:e.vid,t:e.created_at,src:e.src||'direct',camp:e.utm_campaign,device:e.device,browser:e.browser,os:e.os,country:e.country,region:e.region,city:e.city,nv:e.new_visitor,pages:f.pages,joined:f.joined,signed:f.signed,dur:f.dur}});
      var vis={},nv={};S2.forEach(function(s){vis[s.vid]=1;if(s.nv)nv[s.vid]=1});
      var durs=S2.filter(function(s){return s.dur>0}),bounce=S2.filter(function(s){return s.pages<=1}).length;
      var day={};views.forEach(function(e){var d=e.created_at.slice(0,10);(day[d]||(day[d]={v:0,s:{}})).v++;day[d].s[e.sid]=1});
      var daily=j.daily.map(function(d){var x=day[d.d];return {d:d.d,views:x?x.v:0,sessions:x?Object.keys(x.s).length:0}});
      var pg={};views.forEach(function(e){(pg[e.path]||(pg[e.path]={name:e.path,views:0,d:[],s:[]})).views++});
      ev.forEach(function(e){if(e.type==='scroll'&&pg[e.path]){if(e.depth!=null)pg[e.path].d.push(e.depth);if(e.dur)pg[e.path].s.push(e.dur)}});
      var avg=function(a){return a.length?Math.round(a.reduce(function(x,y){return x+y},0)/a.length):0},pc=function(a,n){return a.length?Math.round(100*a.filter(function(x){return x>=n}).length/a.length):0};
      var pages=Object.keys(pg).map(function(k){var p=pg[k];return {name:p.name,views:p.views,avg_depth:avg(p.d),reach50:pc(p.d,50),reach90:pc(p.d,90),avg_sec:Math.round(avg(p.s)/1000)}}).sort(function(a,b){return b.views-a.views}).slice(0,12);
      var srcs={};S2.forEach(function(s){var r=srcs[s.src]||(srcs[s.src]={name:s.src,sessions:0,joined:0,signed:0});r.sessions++;if(s.joined)r.joined++;if(s.signed)r.signed++});
      var camps={};S2.forEach(function(s){if(s.camp){var r=camps[s.camp]||(camps[s.camp]={name:s.camp,sessions:0,signed:0});r.sessions++;if(s.signed)r.signed++}});
      var by=function(l){return function(x){return x[l]}};
      return {days:j.days,live:j.live,
        totals:{views:views.length,sessions:S2.length,visitors:Object.keys(vis).length,new_visitors:Object.keys(nv).length,bounce_pct:S2.length?Math.round(100*bounce/S2.length):0,avg_sec:Math.round(avg(durs.map(by('dur')))/1000)},
        daily:daily,
        funnel:{sessions:S2.length,joined:S2.filter(function(s){return s.joined}).length,signed:S2.filter(function(s){return s.signed}).length,signups_total:j.funnel.signups_total,members_total:j.funnel.members_total},
        sources:Object.keys(srcs).map(function(k){return srcs[k]}).sort(function(a,b){return b.sessions-a.sessions}).slice(0,15),
        campaigns:Object.keys(camps).map(function(k){return camps[k]}).sort(function(a,b){return b.sessions-a.sessions}).slice(0,15),
        countries:top(S2,function(s){return s.country||'Unknown'}),
        regions:top(S2,function(s){return s.region?s.region+(s.country?', '+s.country:''):null}),
        cities:top(S2,function(s){return s.city?s.city+(s.region?', '+s.region:''):null}),
        devices:top(S2,function(s){return s.device||'Unknown'}),browsers:top(S2,function(s){return s.browser||'Other'},8),systems:top(S2,function(s){return s.os||'Other'},8),
        pages:pages,
        recent:S2.sort(function(a,b){return a.t<b.t?1:-1}).slice(0,25).map(function(s){return {t:s.t,src:s.src,country:s.country,region:s.region,city:s.city,device:s.device,browser:s.browser,pages:s.pages,joined:s.joined,signed:s.signed}})};
    }
    var DATA=null;
    function render(j){
      m.textContent='';
      var bad=classify(DATA.ev),nAll=0,nBad=0;Object.keys(DATA.first).forEach(function(k){nAll++;if(bad[k])nBad++});
      var real=DATA.ev.filter(function(e){return !bad[e.sid]});
      var cut=new Date(Date.now()-3e5).toISOString(),lv={};
      (S.real?real:DATA.ev).forEach(function(e){if(e.created_at>=cut)lv[e.sid]=1});
      var live=Object.keys(lv).length;
      j=build(S.real?real:DATA.ev,j);j.live=live;
      var t=j.totals;
      m.appendChild(h('div',{class:'aa-ctl'},[h('button',{type:'button',class:'aa-b'+(S.real?' on':''),onclick:function(){S.real=true;render(DATA.j)},text:'Real people only ('+$$(nAll-nBad)+' visits)'}),h('button',{type:'button',class:'aa-b'+(S.real?'':' on'),onclick:function(){S.real=false;render(DATA.j)},text:'All traffic incl. bots and testing ('+$$(nAll)+' visits)'})]));
      m.appendChild(h('p',{class:'fine',text:$$(nBad)+' visits are bots or our own testing (data-center crawler, selftest links). Everything below follows the button you picked.'}));
      m.appendChild(h('div',{class:'aa-ctl'},[1,7,30,90].map(function(d){return h('button',{type:'button',class:'aa-b'+(S.days===d?' on':''),onclick:function(){S.days=d;go()},text:d===1?'Today':'Last '+d+' days'})}).concat([h('button',{type:'button',class:'aa-b',onclick:function(){go()},text:'Refresh'})])));
      m.appendChild(h('div',{class:'tiles'},[tile(j.live,'on the site now'),tile(t.visitors,'visitors'),tile(t.sessions,'visits'),tile(t.views,'page views'),tile(t.bounce_pct+'%','left after one page'),tile(t.avg_sec+'s','avg. time per visit')]));
      m.appendChild(sec('Visits per day',[chart(j.daily),h('p',{class:'fine',text:'Dark bars are visits, light bars are page views.'})]));
      m.appendChild(sec('From visit to signup',[funnel(j.funnel)]));
      m.appendChild(sec('Where visitors come from',[srcTable(j.sources)],'Facebook, Google and so on. To tell your own posts apart, end links with ?utm_source=name&utm_campaign=post, for example riside.com/?utm_source=facebook&utm_campaign=group-oct.'));
      if(j.campaigns.length)m.appendChild(sec('Campaigns',[bars(j.campaigns.map(function(c){return {name:c.name,n:c.sessions}}))]));
      m.appendChild(h('div',{class:'aa-grid'},[sec('Countries',[bars(j.countries,'n',t.sessions)]),sec('States and regions',[bars(j.regions,'n',t.sessions)]),sec('Cities',[bars(j.cities,'n',t.sessions)]),sec('Devices',[bars(j.devices,'n',t.sessions)]),sec('Browsers',[bars(j.browsers,'n',t.sessions)]),sec('Systems',[bars(j.systems,'n',t.sessions)])]));
      m.appendChild(sec('Pages and scrolling',[pagesTable(j.pages)],'How far down people scroll on each page.'));
      m.appendChild(sec('Click heatmap',[heat(j.pages.length?j.pages:[{name:'/'}])],'Red is where people click most. Shown on a live preview of the page.'));
      m.appendChild(sec('Latest visits',[recentTable(j.recent)]));
      m.appendChild(h('p',{class:'fine',text:'Location is approximate and comes from the visitor’s network. No IP address, name or email is stored. Your own visits from this browser are not counted. Visitors who turn on Do Not Track are skipped.'}));
    }
    function tile(n,l){return h('div',{class:'tile'},[h('b',{text:String(n)}),h('span',{text:l})])}
    function go(){m.textContent='Loading.';Promise.all([rpc('analytics_summary',{p_days:S.days}),fetchEvents()]).then(function(r){var ev=r[1],first={};ev.forEach(function(e){if(e.type==='view')first[e.sid]=1});DATA={j:r[0],ev:ev,first:first};render(r[0])}).catch(function(e){m.textContent='';m.appendChild(h('p',{class:'fine',text:e===404||e===400?'Analytics is not set up yet. Run analytics-setup.sql in Supabase.':'Could not load analytics.'}))})}
    go();
  };
})();
