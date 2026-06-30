export function toast(message, type = 'success') {
  window.dispatchEvent(
    new CustomEvent('portal-toast', {
      detail: { message, type, id: Date.now() + Math.random() },
    })
  );
}
