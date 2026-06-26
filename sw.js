self.addEventListener('push', function(event) {
  var data = {};
  try { data = event.data.json(); } catch(e) {}
  var title = data.title || '🚛 งานโหลดใหม่เข้ามา!';
  var options = {
    body: data.body || 'มีงานใหม่รอโหลด',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'ld-order',
    renotify: true,
    requireInteraction: true,
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].url.indexOf(url) >= 0) { return list[i].focus(); }
    }
    return clients.openWindow(url);
  }));
});
