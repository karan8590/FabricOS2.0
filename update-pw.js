const bcrypt = require('bcrypt');
const { execSync } = require('child_process');

bcrypt.hash('superadmin123', 10).then(h => {
    console.log("Updating password...");
    execSync(\`sqlite3 data/fabricos.db "UPDATE super_admins SET password_hash = '\${h}' WHERE email = 'superadmin@fabricos.com'"\`);
    console.log("Password updated!");
});
