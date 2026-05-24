self.addEventListener('push', (event) => {
  let data = { type: 'general', itemId: null, title: 'QReturn', body: '' }

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() }
    } catch {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body,
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      type: data.type,
      itemId: data.itemId,
    },
    actions: data.itemId
      ? [{ action: 'view', title: 'View Details' }]
      : [],
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const target = event.notification.data?.itemId
    ? `/item/${event.notification.data.itemId}`
    : '/dashboard'

  const urlToOpen = new URL(target, self.location.origin).href

  const promiseChain = clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((windowClients) => {
      const matchingClient = windowClients.find(
        (client) => client.url === urlToOpen
      )
      if (matchingClient) {
        return matchingClient.focus()
      }
      return clients.openWindow(urlToOpen)
    })

  event.waitUntil(promiseChain)
})
