const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/app/api/orders/[id]/route.ts';
let code = fs.readFileSync(file, 'utf8');

const search = `                if (record.action_type === 'Reserved') {
                    newAvailable += Number(record.quantity);
                    newReserved -= Number(record.quantity);
                } else if (record.action_type === 'Consumed') {
                    newAvailable += Number(record.quantity);
                    newUsed -= Number(record.quantity);
                }`;

const replace = `                if (record.action_type === 'Reserved') {
                    newAvailable += Number(record.quantity);
                    newReserved -= Number(record.quantity);
                } else if (record.action_type === 'Consumed') {
                    newReserved += Number(record.quantity);
                    newUsed -= Number(record.quantity);
                }`;

code = code.replace(search, replace);
fs.writeFileSync(file, code);
