// Demande au navigateur de ne pas évincer le localStorage (anti perte de données).
export async function requestPersistentStorage() {
  try {
    if (!navigator.storage || !navigator.storage.persist) return false;
    const already = navigator.storage.persisted ? await navigator.storage.persisted() : false;
    if (already) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
