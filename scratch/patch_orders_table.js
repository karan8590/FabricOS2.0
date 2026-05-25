const fs = require('fs');
const file = '/Users/karandhameliya/Desktop/ag/FabricOS/components/orders/OrdersTable.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix signature issue if it removed currentPage
if (!content.includes('const [currentPage, setCurrentPage] = useState(1);')) {
    content = content.replace(
        'export default function OrdersTable({ orders, onUpdate, onGenerateInvoice, onEdit, activeWidget, selectedIds, onToggleSelect }: OrdersTableProps) {\n    const router = useRouter();',
        'export default function OrdersTable({ orders, onUpdate, onGenerateInvoice, onEdit, activeWidget, selectedIds, onToggleSelect }: OrdersTableProps) {\n    const router = useRouter();\n    const [currentPage, setCurrentPage] = useState(1);'
    );
}

// Restore handleCustomerClick
if (!content.includes('const handleCustomerClick = React.useCallback(')) {
    content = content.replace(
        'const getHighlightClass = () => {',
        'const handleCustomerClick = React.useCallback((customerId: number) => {\n        router.push(`/customers/${customerId}`);\n    }, [router]);\n\n    const getHighlightClass = () => {'
    );
}

fs.writeFileSync(file, content);
console.log("Patched OrdersTable");
