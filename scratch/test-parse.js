const parseDeliveryArea = (city, shippingAddress, deliveryAddress) => {
    const raw = `${city || ''} ${shippingAddress || ''} ${deliveryAddress || ''}`.toLowerCase();
    
    if (raw.includes('udhna') || raw.includes('udhana')) return 'Udhna';
    if (raw.includes('katargam')) return 'Katargam';
    if (raw.includes('ring road') || raw.includes('ringroad')) return 'Ring Road';
    if (raw.includes('pandesara')) return 'Pandesara';
    if (raw.includes('sachin')) return 'Sachin';
    if (raw.includes('vesu')) return 'Vesu';
    if (raw.includes('varachha')) return 'Varachha';
    if (raw.includes('bhatar')) return 'Bhatar';
    if (raw.includes('piplod')) return 'Piplod';
    if (raw.includes('adajan')) return 'Adajan';
    if (raw.includes('saroli')) return 'Saroli';
    if (raw.includes('kadodara')) return 'Kadodara';
    if (city && city.trim() !== '') {
        const c = city.trim();
        return c.charAt(0).toUpperCase() + c.slice(1).toLowerCase();
    }
    return 'Other Areas';
};
console.log(parseDeliveryArea('Surat', 'Plot 42, Pandesara GIDC', ''));
