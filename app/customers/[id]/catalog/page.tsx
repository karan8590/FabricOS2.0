'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ShoppingCart, Search, Heart, Eye, Filter, ChevronRight, Package, Clock, ShieldCheck, MapPin } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import styles from './CatalogPremium.module.css';

export default function CustomerCatalogPage() {
    const { id } = useParams();
    const router = useRouter();
    const [designs, setDesigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    
    // UI State
    const [selectedDesign, setSelectedDesign] = useState<any>(null);
    const [showOrderModal, setShowOrderModal] = useState(false);
    
    // Order Form State
    const [quantity, setQuantity] = useState('100');
    const [notes, setNotes] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [ordering, setOrdering] = useState(false);

    const categories = ['All', 'Cotton', 'Silk', 'Linen', 'Polyester', 'Wool', 'Synthetic'];

    useEffect(() => {
        fetchDesigns();
    }, []);

    const fetchDesigns = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/designs');
            if (res.ok) {
                const data = await res.json();
                setDesigns(data.designs || []);
            }
        } catch (error) {
            console.error('Failed to fetch designs:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredDesigns = designs.filter(d => {
        const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             d.category?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeCategory === 'All' || d.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    const handlePlaceOrder = async () => {
        if (!selectedDesign || !quantity) return;
        setOrdering(true);
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    designId: selectedDesign.id,
                    quantityMeters: parseFloat(quantity),
                    customerId: parseInt(id as string),
                    notes,
                    preferredDeliveryDate: deliveryDate
                })
            });

            if (res.ok) {
                // Success
                setShowOrderModal(false);
                setSelectedDesign(null);
                alert('Success! Your manufacturing order has been placed.');
                router.push(`/customers/${id}/orders`);
            } else {
                const err = await res.json();
                alert(`Error: ${err.error || 'Failed to place order'}`);
            }
        } catch (error) {
            console.error('Ordering failed:', error);
            alert('Something went wrong. Please try again.');
        } finally {
            setOrdering(false);
        }
    };

    return (
        <div className={styles.catalogContainer}>
            <div className={styles.stickyHeader}>
                <div className={styles.filterRow}>
                    <div className={styles.searchWrapper}>
                        <Search className={styles.searchIcon} size={18} />
                        <input
                            type="text"
                            placeholder="Search premium designs..."
                            className={styles.searchInput}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className={styles.filterChips}>
                        {categories.map(cat => (
                            <div 
                                key={cat} 
                                className={`${styles.chip} ${activeCategory === cat ? styles.chipActive : ''}`}
                                onClick={() => setActiveCategory(cat)}
                            >
                                {cat}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className={styles.grid}>
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className={styles.skeletonCard}>
                            <div className={styles.skeletonImage}></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.grid}>
                    {filteredDesigns.map((design) => (
                        <div 
                            key={design.id} 
                            className={styles.card}
                            onClick={() => setSelectedDesign(design)}
                        >
                            <div className={styles.imageWrapper}>
                                {design.image_url ? (
                                    <img src={design.image_url} alt={design.name} className={styles.image} />
                                ) : (
                                    <div className={styles.imagePlaceholder}>
                                        <Package size={32} strokeWidth={1} />
                                    </div>
                                )}
                                <div className={styles.cardBadges}>
                                    <span className={styles.categoryBadge}>{design.category || 'Fabric'}</span>
                                </div>
                                <div className={styles.quickActions}>
                                    <div className={styles.actionBtn} title="Save to Favorites"><Heart size={16} /></div>
                                    <div className={styles.actionBtn} title="Quick Preview"><Eye size={16} /></div>
                                    <div 
                                        className={styles.actionBtn} 
                                        title="Place Order"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedDesign(design);
                                            setShowOrderModal(true);
                                        }}
                                    >
                                        <ShoppingCart size={16} />
                                    </div>
                                </div>
                            </div>
                            
                            <div className={styles.cardInfo}>
                                <div className={styles.topInfo}>
                                    <h3 className={styles.designName}>{design.name}</h3>
                                    <div className={styles.metadata}>
                                        <span>{design.gsm || '220'} GSM</span>
                                        <span>•</span>
                                        <span>MOQ: 50m</span>
                                    </div>
                                </div>
                                
                                <div className={styles.bottomInfo}>
                                    <div className={styles.priceWrapper}>
                                        <span className={styles.priceLabel}>Price per meter</span>
                                        <span className={styles.priceValue}>₹{design.price_per_meter}</span>
                                    </div>
                                    <button 
                                        className={styles.compactCTA}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedDesign(design);
                                            setShowOrderModal(true);
                                        }}
                                    >
                                        Place Order
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Design Detail Side Drawer */}
            {selectedDesign && !showOrderModal && (
                <Modal 
                    isOpen={!!selectedDesign} 
                    onClose={() => setSelectedDesign(null)}
                    title="Design Details"
                >
                    <div className="global-drawer-content">
                        <div className={styles.drawerGallery}>
                            {selectedDesign.image_url ? (
                                <img src={selectedDesign.image_url} className={styles.image} />
                            ) : (
                                <div className={styles.imagePlaceholder}><Package size={64} /></div>
                            )}
                        </div>

                        <div className={styles.drawerInfoGrid}>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Composition</span>
                                <span className={styles.infoValue}>{selectedDesign.category} Blend</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>GSM / Weight</span>
                                <span className={styles.infoValue}>{selectedDesign.gsm || '220'} GSM</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Lead Time</span>
                                <span className={styles.infoValue}>12-15 Days</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Available Width</span>
                                <span className={styles.infoValue}>58 - 60 Inches</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                            <Button variant="ghost" fullWidth onClick={() => setSelectedDesign(null)}>Close</Button>
                            <Button variant="primary" fullWidth onClick={() => setShowOrderModal(true)}>
                                <ShoppingCart size={18} />
                                <span>Place Manufacturing Order</span>
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Order Confirmation Modal */}
            {showOrderModal && selectedDesign && (
                <Modal 
                    isOpen={showOrderModal} 
                    onClose={() => setShowOrderModal(false)}
                    title="Place Manufacturing Order"
                >
                    <div className={styles.orderForm}>
                        <div className={styles.modalDesignInfo}>
                            <strong>Requesting:</strong> {selectedDesign.name}
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <Input
                                label="Quantity (Meters)"
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                min="50"
                            />
                            <Input
                                label="Expected Delivery"
                                type="date"
                                value={deliveryDate}
                                onChange={(e) => setDeliveryDate(e.target.value)}
                            />
                        </div>

                        <Input
                            label="Special Instructions / Notes"
                            type="text"
                            placeholder="Add specific requirements or color preferences..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />

                        <div className={styles.totalBanner}>
                            <span className={styles.totalLabel}>Estimated Production Cost:</span>
                            <span className={styles.totalPrice}>₹{(selectedDesign.price_per_meter * (parseFloat(quantity) || 0)).toLocaleString()}</span>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                            <Button variant="ghost" fullWidth onClick={() => setShowOrderModal(false)}>Cancel</Button>
                            <Button 
                                variant="primary" 
                                fullWidth 
                                onClick={handlePlaceOrder}
                                loading={ordering}
                                disabled={!quantity || parseFloat(quantity) < 50}
                            >
                                Submit Manufacturing Order
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
