/* Admin > Analytics tab. Loaded only when the tab is opened. */
(function(){
  var S={days:7,path:'/',mobile:false};
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
        rpc('analytics_clicks',{p_path:S.path,p_days:S.days,p_mobile:S.mobile}).then(function(r){
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
    function render(j){
      m.textContent='';
      var t=j.totals;
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
    function go(){m.textContent='Loading.';rpc('analytics_summary',{p_days:S.days}).then(render).catch(function(e){m.textContent='';m.appendChild(h('p',{class:'fine',text:e===404||e===400?'Analytics is not set up yet. Run analytics-setup.sql in Supabase.':'Could not load analytics.'}))})}
    go();
  };
})();
