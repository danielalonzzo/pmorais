/*
 * Carga inicial dos clientes sem conta.
 *
 * Cria (ou actualiza) um documento em `users` por cada cliente da lista fornecida
 * pelo Paulo. São clientes reais que nunca usaram o site e não têm utilizador de
 * Firebase Auth: ficam com `hasAccount: false`, o que os faz aparecer em /perfis
 * com a etiqueta "Utilizador sem conta" e no selector da Agenda Manual.
 *
 * O id vem de buildGuestClientId() (js/guest-clients.js — a mesma função que o
 * browser usa ao criar clientes pelo botão em /perfis), portanto o script é
 * idempotente: correr outra vez actualiza as fichas em vez de as duplicar.
 *
 * Uso:
 *   node functions/seed-clientes-sem-conta.js            (aplica)
 *   node functions/seed-clientes-sem-conta.js --dry-run  (só mostra o que faria)
 *
 * Credenciais: Application Default Credentials (gcloud auth application-default
 * login), ou GOOGLE_APPLICATION_CREDENTIALS. NÃO usa functions/service-account.json:
 * essa conta (booking-bot) só tem acesso ao Google Calendar, não ao Firestore.
 */

const admin = require('firebase-admin');

const PROJECT_ID = 'paulo-morais';

// Nomes com a acentuação portuguesa normalizada. A grafia não foi corrigida:
// "Teressa Ruivo", "Joanna Noronha" e "Paramida" ficam como foram enviados.
// O telemóvel do Pedro Correia tem um dígito a mais do que um móvel português
// (ver AVISOS no fim) — é gravado tal como veio, para o Paulo confirmar.
const CLIENTES = [
    ['Carina Silveira',     '+351916359482'],
    ['Mafalda Fernandes',   '+351917154271'],
    ['Luís Ribeiro',        '+351913607546'],
    ['Otília',              '+351917813931'],
    ['Rui Silva',           '+351932556618'],
    ['Maria João',          '+351919018725'],
    ['Beatriz Figueiredo',  '+351914406911'],
    ['Vanessa Borges',      '+351968692121'],
    ['Ana Chacim',          '+351917972111'],
    ['Carmo Pinto',         '+351919588057'],
    ['Joanna Noronha',      '+351919580723'],
    ['Marcos Borges',       '+351932111481'],
    ['Teressa Ruivo',       '+351917585270'],
    ['Marta Noronha',       '+351919606710'],
    ['Beatriz',             '+351966098076'],
    ['Inês Gato',           '+351964190888'],
    ['Paramida',            '+491712002896'],
    ['Conceição Lira',      '+351968171912'],
    ['Nuno Pinto',          '+351913449757'],
    ['Mónica Fonseca',      '+351918201499'],
    ['Catarina Noronha',    '+351934402618'],
    ['Zé Maria',            '+351910313645'],
    ['João Moura',          '+351919612419'],
    ['Mariana Silva',       '+351962407310'],
    ['Carolina Lira',       '+351926444462'],
    ['Maria do Céu',        '+351967423765'],
    ['Bruno Lira',          '+351968074025'],
    ['João Borges',         '+351917305454'],
    ['Francisco Noronha',   '+351968686857'],
    ['Pedro Correia',       '+3519190990799']
];

const AVISOS = [
    'Pedro Correia (+3519190990799): 10 dígitos depois de +351; os móveis portugueses têm 9. Provável gralha — confirmar com o Paulo.',
    'Paramida (+491712002896): número alemão e nome único. Confirmar.',
    '"Teressa Ruivo" e "Joanna Noronha": grafias possivelmente com gralha. Gravadas tal como foram enviadas.'
];

function initAdmin() {
    // Application Default Credentials, como em set_root_claim.js.
    // Nota: functions/service-account.json NÃO serve aqui — é a conta booking-bot,
    // criada só para o Google Calendar, sem permissões IAM no Firestore.
    // Use `gcloud auth application-default login` ou GOOGLE_APPLICATION_CREDENTIALS
    // com uma conta que tenha o papel Cloud Datastore User no projeto.
    admin.initializeApp({ projectId: PROJECT_ID });
}

async function main() {
    const dryRun = process.argv.includes('--dry-run');
    const { buildGuestClientId } = await import('../js/guest-clients.js');

    // Ids repetidos significariam fichas fundidas em silêncio — vale a pena parar.
    const seen = new Map();
    for (const [name, phone] of CLIENTES) {
        const id = buildGuestClientId(name, phone);
        if (seen.has(id)) {
            console.error(`Id duplicado "${id}": "${seen.get(id)}" e "${name}". Aborta.`);
            process.exit(1);
        }
        seen.set(id, name);
    }

    if (dryRun) {
        for (const [id, name] of seen) console.log(`${id}\t${name}`);
        console.log(`\n${seen.size} clientes (dry run, nada foi escrito).`);
        AVISOS.forEach(a => console.warn(`AVISO: ${a}`));
        return;
    }

    initAdmin();
    const db = admin.firestore();
    const now = new Date().toISOString();

    let criados = 0;
    let actualizados = 0;

    for (const [name, phone] of CLIENTES) {
        const id = buildGuestClientId(name, phone);
        const ref = db.collection('users').doc(id);
        const snap = await ref.get();

        // createdAt só na criação, para o purge RGPD não reiniciar o relógio.
        const base = {
            name,
            phone,
            email: '',
            role: 'client',
            hasAccount: false,
            profileCompleted: false,
            isDeactivated: false,
            updatedAt: now
        };
        if (!snap.exists) {
            base.createdAt = now;
            base.lastActivityAt = now;
            base.createdBy = 'seed-clientes-sem-conta';
        }

        await ref.set(base, { merge: true });
        snap.exists ? actualizados++ : criados++;
        console.log(`${snap.exists ? 'actualizado' : 'criado     '}  ${id}  ${name}`);
    }

    console.log(`\nFeito. ${criados} criados, ${actualizados} actualizados.`);
    AVISOS.forEach(a => console.warn(`AVISO: ${a}`));
}

main().then(() => process.exit(0)).catch(err => {
    console.error('Erro ao carregar os clientes sem conta:', err);
    process.exit(1);
});
