import type { Metadata } from 'next';
import ProductionLanding from '@/components/ProductionLanding';

export const metadata: Metadata = {
  title: 'LIGA VOLI MAHASISWA (LVM) - Official',
  description: 'Display Resmi Liga Voli Mahasiswa Nasional.',
};

export default function ProductionPage() {
  return <ProductionLanding />;
}
