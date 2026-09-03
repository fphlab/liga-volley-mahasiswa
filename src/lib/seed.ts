import { withDatabaseLock, getAllTeams, insertTeamWithMembers, clearAllTeams } from './db';
import { buildDemoTeams } from './demoData';

/**
 * Seeder data demo ke database aktif (Supabase).
 * - Tanpa `force`: hanya mengisi bila database masih kosong.
 * - Dengan `force=true`: menghapus seluruh data lama lalu mengisi ulang.
 */
export async function seedInitialData(force = false): Promise<{ success: boolean; message: string; count: number }> {
  return withDatabaseLock(async () => {
    const existing = await getAllTeams();

    if (existing.length > 0 && !force) {
      return { success: true, message: 'Database sudah memiliki data tim.', count: existing.length };
    }

    if (force && existing.length > 0) {
      await clearAllTeams();
    }

    const demoTeams = buildDemoTeams();
    for (const team of demoTeams) {
      await insertTeamWithMembers(team);
    }

    return {
      success: true,
      message: `Berhasil mengisi ${demoTeams.length} tim simulasi lengkap beserta 20 personel per tim.`,
      count: demoTeams.length,
    };
  });
}
