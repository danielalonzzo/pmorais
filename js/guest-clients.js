/*
 * Developed by Elysium λ Development & Research
 * A European company
 */

/*
 * Clientes sem conta ("guest clients").
 *
 * São documentos normais da coleção `users`, criados pelo admin, sem utilizador
 * de Firebase Auth associado. O id é derivado do nome e do telemóvel para que
 * criar o mesmo cliente duas vezes actualize a ficha em vez de a duplicar.
 *
 * Este módulo não importa nada — é carregado tanto pelo browser (js/auth.js,
 * js/admin-perfis.js) como pelo script de seed em Node
 * (functions/seed-clientes-sem-conta.js), que o carrega por import() dinâmico.
 */

export const GUEST_ID_PREFIX = 'guest_';

export function buildGuestClientId(name, phone) {
    const slug = String(name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'cliente';

    const digits = String(phone || '').replace(/\D/g, '');
    const tail = digits.slice(-4).padStart(4, '0');

    return `${GUEST_ID_PREFIX}${slug}-${tail}`;
}

export function isGuestClientId(id) {
    return typeof id === 'string' && id.startsWith(GUEST_ID_PREFIX);
}
