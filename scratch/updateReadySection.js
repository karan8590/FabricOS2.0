const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/components/dispatch/ReadyToDispatchSection.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('vendor_name?: string;')) {
    code = code.replace(
        'customer_name: string;',
        'customer_name: string;\n    vendor_name?: string;\n    queued_expected_date?: string;'
    );
}

const headerSearch = `                                <th>Qty</th>
                                <th>Destination</th>
                                <th>Action</th>`;
const headerReplace = `                                <th>Qty</th>
                                <th>Vendor / Transport</th>
                                <th>Expected Return</th>
                                <th>Destination</th>
                                <th>Action</th>`;

code = code.replace(headerSearch, headerReplace);

const rowSearch = `                                        <td>{order.quantity}m</td>
                                        <td>
                                            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, backgroundColor: dest.bg, color: dest.color }}>
                                                {dest.label}
                                            </span>
                                        </td>
                                        <td>
                                            <Button variant="secondary" onClick={() => onDispatchNow(order)}>
                                                Dispatch Now
                                            </Button>
                                        </td>`;

const rowReplace = `                                        <td>{order.quantity}m</td>
                                        <td style={{ fontSize: '13px' }}>{order.vendor_name || '-'}</td>
                                        <td style={{ fontSize: '13px' }}>{order.queued_expected_date ? new Date(order.queued_expected_date).toLocaleDateString() : '-'}</td>
                                        <td>
                                            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, backgroundColor: dest.bg, color: dest.color }}>
                                                {dest.label}
                                            </span>
                                        </td>
                                        <td>
                                            <Button variant="secondary" onClick={() => onDispatchNow(order)}>
                                                Dispatch Now
                                            </Button>
                                        </td>`;

code = code.replace(rowSearch, rowReplace);

fs.writeFileSync(file, code);
