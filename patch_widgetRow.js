const fs = require('fs');
let css = fs.readFileSync('app/orders/Orders.module.css', 'utf8');

const regex = /\.widgetRow \{\s*display: flex;\s*flex-wrap: nowrap;\s*gap: 10px;\s*overflow-x: auto;\s*scrollbar-width: none;\s*padding-bottom: 8px;\s*scroll-snap-type: x mandatory;\s*-webkit-overflow-scrolling: touch;\s*\}/g;

const replacement = `.widgetRow {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 12px !important;
        overflow-x: visible;
        padding-bottom: 0;
        scroll-snap-type: none;
    }

    .widgetRow::-webkit-scrollbar { display: none; }

    .widgetRow > * {
        min-width: 0 !important;
        max-width: 100% !important;
        flex-shrink: 1;
        scroll-snap-align: none;
    }
    
    .widgetRow > *:last-child:nth-child(odd) {
        grid-column: span 2;
    }`;

if (css.includes('flex-wrap: nowrap;') && css.includes('scroll-snap-type: x mandatory;')) {
    css = css.replace(regex, replacement);
    fs.writeFileSync('app/orders/Orders.module.css', css);
    console.log('Replaced');
} else {
    console.log('Not found');
}
