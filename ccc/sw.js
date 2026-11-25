// Scope is /ccc/ only (file lives in /ccc/), so it cannot touch the rest of riside.com.
self.addEventListener('push',e=>{let d={};try{d=e.data.json()}catch(_){d={title:'Cozy Crochet Club',body:e.data?e.data.text():''}}
e.waitUntil(self.registration.showNotification(d.title||'New creator reply',{body:d.body||'',icon:'icon-192.png',badge:'icon-192.png',data:{url:'/ccc/'}}))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.openWindow('/ccc/'))});
