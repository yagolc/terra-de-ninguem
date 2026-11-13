// Avisos no celular: o service worker do app (gerado pelo vite-plugin-pwa) importa este arquivo. O servidor manda
// { titulo, corpo, url, tag }; tocar na notificação abre (ou traz para frente) o jogo na aba certa.
self.addEventListener('push', (evento) => {
  let dados = {};
  try {
    dados = evento.data ? evento.data.json() : {};
  } catch {
    dados = { corpo: evento.data ? evento.data.text() : '' };
  }
  evento.waitUntil(
    self.registration.showNotification(dados.titulo || 'Terra de Ninguém', {
      body: dados.corpo || '',
      icon: '/icone-192.png',
      badge: '/icone-aviso-96.png',
      tag: dados.tag || undefined,
      lang: 'pt-BR',
      data: { url: dados.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const destino = new URL((evento.notification.data && evento.notification.data.url) || '/', self.location.origin).href;
  evento.waitUntil(
    (async () => {
      const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const aberta = janelas.find((j) => new URL(j.url).origin === self.location.origin);
      if (aberta) {
        await aberta.focus();
        // A aba do jogo muda pelo endereço (#mapa, #cartas…): só troca o trecho depois do #.
        if ('navigate' in aberta && aberta.url !== destino) await aberta.navigate(destino);
        return;
      }
      await self.clients.openWindow(destino);
    })(),
  );
});
