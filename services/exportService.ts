import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

// Type definitions
interface NutritionEntry {
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  quantity?: number;
}

interface WeightEntry {
  date: string;
  weight: number;
}

interface MeasurementEntry {
  date: string;
  type: string; // chest, waist, hip, thigh, etc.
  measurement: number;
}

interface WaterEntry {
  date: string;
  amount: number;
}

interface FastingEntry {
  date: string;
  duration: number; // hours
  startTime: string;
  endTime: string;
}

interface ExportRequest {
  userId: string;
  startDate: string;
  endDate: string;
  includeWeight?: boolean;
  includeMeasurements?: boolean;
  includeWater?: boolean;
  includeFasting?: boolean;
  includeRecipes?: boolean;
  includeTemplates?: boolean;
  nutrition: NutritionEntry[];
  weight?: WeightEntry[];
  measurements?: MeasurementEntry[];
  water?: WaterEntry[];
  fasting?: FastingEntry[];
}

interface FullBackupData {
  userId: string;
  backupDate: string;
  version: string;
  meals: NutritionEntry[];
  templates?: any[];
  recipes?: any[];
  weight?: WeightEntry[];
  measurements?: MeasurementEntry[];
  waterIntake?: WaterEntry[];
  fasting?: FastingEntry[];
  photos?: any[];
  settings?: any;
}

class ExportService {
  private static readonly DIRECTORY = `${FileSystem.documentDirectory}cals2gains/exports/`;
  private static readonly BACKUP_DIRECTORY = `${FileSystem.documentDirectory}cals2gains/backups/`;

  /**
   * Initialize directory structures
   */
  static async ensureDirectories(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.DIRECTORY);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.DIRECTORY, { intermediates: true });
      }

      const backupDirInfo = await FileSystem.getInfoAsync(this.BACKUP_DIRECTORY);
      if (!backupDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.BACKUP_DIRECTORY, { intermediates: true });
      }
    } catch (error) {
      console.error('Error ensuring directories:', error);
      throw error;
    }
  }

  /**
   * Export nutrition data to CSV format
   * Columns: Date, Meal Type, Food Name, Calories, Protein, Carbs, Fat, Fiber
   */
  static async exportToCSV(data: ExportRequest): Promise<string> {
    try {
      await this.ensureDirectories();

      const csvHeaders = ['Date', 'Meal Type', 'Food Name', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Fiber (g)'];
      const csvRows: string[] = [csvHeaders.map(h => `"${h}"`).join(',')];

      // Add nutrition data
      if (data.nutrition && data.nutrition.length > 0) {
        data.nutrition.forEach((entry) => {
          const row = [
            `"${entry.date}"`,
            `"${entry.mealType}"`,
            `"${entry.foodName}"`,
            entry.calories.toString(),
            entry.protein.toFixed(1),
            entry.carbs.toFixed(1),
            entry.fat.toFixed(1),
            entry.fiber.toFixed(1),
          ];
          csvRows.push(row.join(','));
        });
      }

      // Add weight section if included
      if (data.includeWeight && data.weight && data.weight.length > 0) {
        csvRows.push('');
        csvRows.push(`"WEIGHT TRACKING"`);
        csvRows.push(`"Date","Weight (kg)"`);
        data.weight.forEach((entry) => {
          csvRows.push(`"${entry.date}",${entry.weight.toFixed(2)}`);
        });
      }

      // Add measurements section if included
      if (data.includeMeasurements && data.measurements && data.measurements.length > 0) {
        csvRows.push('');
        csvRows.push(`"MEASUREMENTS"`);
        csvRows.push(`"Date","Type","Value (cm)"`);
        data.measurements.forEach((entry) => {
          csvRows.push(`"${entry.date}","${entry.type}",${entry.measurement.toFixed(1)}`);
        });
      }

      // Add water intake section if included
      if (data.includeWater && data.water && data.water.length > 0) {
        csvRows.push('');
        csvRows.push(`"WATER INTAKE"`);
        csvRows.push(`"Date","Amount (ml)"`);
        data.water.forEach((entry) => {
          csvRows.push(`"${entry.date}",${entry.amount}`);
        });
      }

      // Add fasting section if included
      if (data.includeFasting && data.fasting && data.fasting.length > 0) {
        csvRows.push('');
        csvRows.push(`"FASTING"`);
        csvRows.push(`"Date","Duration (hours)","Start Time","End Time"`);
        data.fasting.forEach((entry) => {
          csvRows.push(`"${entry.date}",${entry.duration},"${entry.startTime}","${entry.endTime}"`);
        });
      }

      // Add UTF-8 BOM for Excel compatibility
      const csvContent = '\uFEFF' + csvRows.join('\n');
      const fileName = `Cals2Gains_Export_${new Date().toISOString().split('T')[0]}.csv`;
      const filePath = `${this.DIRECTORY}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      return filePath;
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw error;
    }
  }

  /**
   * Export data to PDF format with branding
   */
  static async exportToPDF(data: ExportRequest): Promise<string> {
    try {
      await this.ensureDirectories();

      const calculateAverageCalories = () => {
        if (!data.nutrition || data.nutrition.length === 0) return 0;
        const total = data.nutrition.reduce((sum, entry) => sum + entry.calories, 0);
        return Math.round(total / data.nutrition.length);
      };

      const calculateAverageMacros = () => {
        if (!data.nutrition || data.nutrition.length === 0) {
          return { protein: 0, carbs: 0, fat: 0 };
        }
        const total = data.nutrition.reduce(
          (acc, entry) => ({
            protein: acc.protein + entry.protein,
            carbs: acc.carbs + entry.carbs,
            fat: acc.fat + entry.fat,
          }),
          { protein: 0, carbs: 0, fat: 0 }
        );
        return {
          protein: Math.round((total.protein / data.nutrition.length) * 10) / 10,
          carbs: Math.round((total.carbs / data.nutrition.length) * 10) / 10,
          fat: Math.round((total.fat / data.nutrition.length) * 10) / 10,
        };
      };

      const avgCalories = calculateAverageCalories();
      const avgMacros = calculateAverageMacros();

      // Group nutrition data by date
      const dataByDate: { [date: string]: NutritionEntry[] } = {};
      if (data.nutrition) {
        data.nutrition.forEach((entry) => {
          if (!dataByDate[entry.date]) {
            dataByDate[entry.date] = [];
          }
          dataByDate[entry.date].push(entry);
        });
      }

      // Build nutrition table rows
      let nutritionTableRows = '';
      Object.entries(dataByDate).forEach(([date, entries]) => {
        const dayTotal = entries.reduce((sum, e) => sum + e.calories, 0);
        nutritionTableRows += `
          <tr style="border-bottom: 1px solid #e5e5ea;">
            <td style="padding: 10px; font-weight: 600; color: #1F2937;">${date}</td>
            <td style="padding: 10px; text-align: right;">
              ${entries.map((e) => e.foodName).join(', ')}
            </td>
            <td style="padding: 10px; text-align: right; font-weight: 600;">${dayTotal}</td>
            <td style="padding: 10px; text-align: right;">
              ${Math.round((entries.reduce((s, e) => s + e.protein, 0) / entries.length) * 10) / 10}g
            </td>
            <td style="padding: 10px; text-align: right;">
              ${Math.round((entries.reduce((s, e) => s + e.carbs, 0) / entries.length) * 10) / 10}g
            </td>
            <td style="padding: 10px; text-align: right;">
              ${Math.round((entries.reduce((s, e) => s + e.fat, 0) / entries.length) * 10) / 10}g
            </td>
          </tr>
        `;
      });

      // Build weight chart if included
      let weightSection = '';
      if (data.includeWeight && data.weight && data.weight.length > 0) {
        let weightRows = '';
        data.weight.forEach((entry) => {
          weightRows += `
            <tr style="border-bottom: 1px solid #e5e5ea;">
              <td style="padding: 10px;">${entry.date}</td>
              <td style="padding: 10px; text-align: right; font-weight: 600;">${entry.weight.toFixed(2)} kg</td>
            </tr>
          `;
        });

        weightSection = `
          <div style="margin-top: 30px; page-break-inside: avoid;">
            <h2 style="font-size: 18px; font-weight: 600; color: #1F2937; margin-bottom: 15px;">Weight Tracking</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 12px; text-align: left; font-weight: 600;">Date</th>
                  <th style="padding: 12px; text-align: right; font-weight: 600;">Weight</th>
                </tr>
              </thead>
              <tbody>
                ${weightRows}
              </tbody>
            </table>
          </div>
        `;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1F2937; line-height: 1.6; }
              .container { padding: 40px; max-width: 900px; margin: 0 auto; }
              .header { border-bottom: 2px solid #7C3AED; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { font-size: 24px; font-weight: 700; color: #7C3AED; margin-bottom: 10px; }
              .date-range { color: #6B7280; font-size: 14px; }
              .summary { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px; margin-bottom: 30px; }
              .summary-item { background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 4px solid #7C3AED; }
              .summary-value { font-size: 24px; font-weight: 700; color: #7C3AED; }
              .summary-label { color: #6B7280; font-size: 12px; margin-top: 5px; text-transform: uppercase; }
              h2 { font-size: 18px; font-weight: 600; margin: 30px 0 15px 0; color: #1F2937; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th { background-color: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; color: #1F2937; }
              td { padding: 10px; }
              .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5ea; color: #6B7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">Cals2Gains</div>
                <div class="date-range">Export from ${data.startDate} to ${data.endDate}</div>
              </div>

              <div class="summary">
                <div class="summary-item">
                  <div class="summary-value">${avgCalories}</div>
                  <div class="summary-label">Avg Daily Calories</div>
                </div>
                <div class="summary-item">
                  <div class="summary-value">${avgMacros.protein}g</div>
                  <div class="summary-label">Avg Protein</div>
                </div>
                <div class="summary-item">
                  <div class="summary-value">${avgMacros.carbs}g</div>
                  <div class="summary-label">Avg Carbs</div>
                </div>
                <div class="summary-item">
                  <div class="summary-value">${avgMacros.fat}g</div>
                  <div class="summary-label">Avg Fat</div>
                </div>
              </div>

              <h2>Daily Breakdown</h2>
              <table>
                <thead>
                  <tr style="background-color: #f3f4f6;">
                    <th style="padding: 12px; font-weight: 600;">Date</th>
                    <th style="padding: 12px; font-weight: 600;">Foods</th>
                    <th style="padding: 12px; text-align: right; font-weight: 600;">Calories</th>
                    <th style="padding: 12px; text-align: right; font-weight: 600;">Protein</th>
                    <th style="padding: 12px; text-align: right; font-weight: 600;">Carbs</th>
                    <th style="padding: 12px; text-align: right; font-weight: 600;">Fat</th>
                  </tr>
                </thead>
                <tbody>
                  ${nutritionTableRows}
                </tbody>
              </table>

              ${weightSection}

              <div class="footer">
                <p>Generated on ${new Date().toLocaleString()} | Cals2Gains v1.0</p>
                <p>This report contains your personal nutrition and health data. Keep it confidential.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const fileName = `Cals2Gains_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      const newPath = `${this.DIRECTORY}${fileName}`;

      if (Platform.OS === 'ios') {
        await FileSystem.copyAsync({ from: uri, to: newPath });
      } else {
        await FileSystem.moveAsync({ from: uri, to: newPath });
      }

      return newPath;
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw error;
    }
  }

  /**
   * Export data to XLSX-compatible CSV format
   */
  static async exportToExcel(data: ExportRequest): Promise<string> {
    // For XLSX compatibility, we use CSV with specific formatting
    return this.exportToCSV(data);
  }

  /**
   * Generate complete backup of user data
   */
  static async generateBackup(userId: string): Promise<string> {
    try {
      await this.ensureDirectories();

      // Note: In production, fetch actual data from database/storage
      const backupData: FullBackupData = {
        userId,
        backupDate: new Date().toISOString(),
        version: '1.0',
        meals: [],
        templates: [],
        recipes: [],
        weight: [],
        measurements: [],
        waterIntake: [],
        fasting: [],
        photos: [],
        settings: {
          preferredUnits: 'metric',
          language: 'es',
          theme: 'dark',
          nutritionMode: 'advanced',
          reminders: {
            meals: true,
            water: true,
            weight: true,
            fasting: true,
          },
        },
      };

      const backupJson = JSON.stringify(backupData, null, 2);
      const fileName = `Cals2Gains_Backup_${userId}_${new Date().toISOString().split('T')[0]}.json`;
      const filePath = `${this.BACKUP_DIRECTORY}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, backupJson, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      return filePath;
    } catch (error) {
      console.error('Error generating backup:', error);
      throw error;
    }
  }

  /**
   * Restore data from backup file
   */
  static async importBackup(userId: string, backupJson: string): Promise<boolean> {
    try {
      const backupData: FullBackupData = JSON.parse(backupJson);

      // Validate backup structure
      if (!backupData.userId || !backupData.version) {
        throw new Error('Invalid backup format');
      }

      // In production, save to database/storage
      // For now, we'll just validate
      console.log(`Backup imported for user ${userId}:`, {
        meals: backupData.meals?.length || 0,
        weight: backupData.weight?.length || 0,
        measurements: backupData.measurements?.length || 0,
      });

      return true;
    } catch (error) {
      console.error('Error importing backup:', error);
      throw error;
    }
  }

  /**
   * Share exported file via system share sheet
   */
  static async shareExport(filePath: string): Promise<void> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
      }

      await Sharing.shareAsync(filePath, {
        mimeType: filePath.endsWith('.pdf') ? 'application/pdf' : 'text/csv',
        dialogTitle: 'Share Cals2Gains Export',
      });
    } catch (error) {
      console.error('Error sharing export:', error);
      throw error;
    }
  }

  /**
   * Get list of recent exports
   */
  static async listRecentExports(limit: number = 10): Promise<string[]> {
    try {
      await this.ensureDirectories();
      const files = await FileSystem.readDirectoryAsync(this.DIRECTORY);
      return files.slice(-limit).reverse();
    } catch (error) {
      console.error('Error listing exports:', error);
      return [];
    }
  }

  /**
   * Get list of recent backups
   */
  static async listRecentBackups(limit: number = 5): Promise<string[]> {
    try {
      await this.ensureDirectories();
      const files = await FileSystem.readDirectoryAsync(this.BACKUP_DIRECTORY);
      return files.slice(-limit).reverse();
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }

  /**
   * Delete export file
   */
  static async deleteExport(fileName: string): Promise<void> {
    try {
      const filePath = `${this.DIRECTORY}${fileName}`;
      await FileSystem.deleteAsync(filePath);
    } catch (error) {
      console.error('Error deleting export:', error);
      throw error;
    }
  }

  /**
   * Delete backup file
   */
  static async deleteBackup(fileName: string): Promise<void> {
    try {
      const filePath = `${this.BACKUP_DIRECTORY}${fileName}`;
      await FileSystem.deleteAsync(filePath);
    } catch (error) {
      console.error('Error deleting backup:', error);
      throw error;
    }
  }
}

export default ExportService;
