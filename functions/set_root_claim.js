const admin = require('firebase-admin');

// Inicializa la aplicación usando Application Default Credentials.
// Es necesario definir la variable de entorno GOOGLE_APPLICATION_CREDENTIALS 
// apuntando al archivo de credenciales de la cuenta de servicio (serviceAccountKey.json).
admin.initializeApp();

const targetEmail = 'danielalonzzo@icloud.com';

async function grantRootRole() {
  try {
    console.log(`Buscando usuario con email: ${targetEmail}`);
    const userRecord = await admin.auth().getUserByEmail(targetEmail);
    console.log(`Usuario encontrado (UID: ${userRecord.uid}).`);
    
    // Inyecta el Custom Claim
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'root' });
    console.log(`¡Éxito! Se ha asignado el Custom Claim { "role": "root" } al usuario ${targetEmail}.`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error al intentar asignar el rol root:', error);
    process.exit(1);
  }
}

grantRootRole();
