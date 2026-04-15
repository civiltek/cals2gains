import ExportService from '../../services/exportService';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const mockWriteFile = FileSystem.writeAsStringAsync as jest.Mock;
const mockReadDir = FileSystem.readDirectoryAsync as jest.Mock;
const mockDeleteFile = FileSystem.deleteAsync as jest.Mock;
const mockPrint = Print.printToFileAsync as jest.Mock;
const mockShareAvailable = Sharing.isAvailableAsync as jest.Mock;
const mockShare = Sharing.shareAsync as jest.Mock;

function makeExportRequest(overrides: any = {}) {
  return {
    userId: 'u1',
    startDate: '2026-04-01',
    endDate: '2026-04-14',
    nutrition: [
      { date: '2026-04-01', mealType: 'lunch', foodName: 'Pollo con arroz', calories: 500, protein: 40, carbs: 50, fat: 15, fiber: 3 },
      { date: '2026-04-01', mealType: 'dinner', foodName: 'Salmón', calories: 600, protein: 45, carbs: 20, fat: 25, fiber: 2 },
      { date: '2026-04-02', mealType: 'breakfast', foodName: 'Huevos', calories: 300, protein: 20, carbs: 5, fat: 15, fiber: 0 },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ExportService', () => {
  describe('exportToCSV', () => {
    it('writes a CSV file with correct headers', async () => {
      const path = await ExportService.exportToCSV(makeExportRequest());

      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      const [filePath, content] = mockWriteFile.mock.calls[0];
      expect(filePath).toContain('Cals2Gains_Export_');
      expect(filePath).toContain('.csv');

      // Check headers
      expect(content).toContain('"Date"');
      expect(content).toContain('"Calories"');
      expect(content).toContain('"Protein (g)"');
    });

    it('includes UTF-8 BOM for Excel compatibility', async () => {
      await ExportService.exportToCSV(makeExportRequest());

      const content = mockWriteFile.mock.calls[0][1];
      expect(content.charCodeAt(0)).toBe(0xFEFF);
    });

    it('includes nutrition data rows', async () => {
      await ExportService.exportToCSV(makeExportRequest());

      const content = mockWriteFile.mock.calls[0][1];
      expect(content).toContain('Pollo con arroz');
      expect(content).toContain('500');
      expect(content).toContain('Salmón');
    });

    it('includes weight section when requested', async () => {
      await ExportService.exportToCSV(makeExportRequest({
        includeWeight: true,
        weight: [
          { date: '2026-04-01', weight: 75.5 },
          { date: '2026-04-07', weight: 75.0 },
        ],
      }));

      const content = mockWriteFile.mock.calls[0][1];
      expect(content).toContain('WEIGHT TRACKING');
      expect(content).toContain('75.50');
    });

    it('includes water section when requested', async () => {
      await ExportService.exportToCSV(makeExportRequest({
        includeWater: true,
        water: [{ date: '2026-04-01', amount: 2000 }],
      }));

      const content = mockWriteFile.mock.calls[0][1];
      expect(content).toContain('WATER INTAKE');
      expect(content).toContain('2000');
    });

    it('includes fasting section when requested', async () => {
      await ExportService.exportToCSV(makeExportRequest({
        includeFasting: true,
        fasting: [{ date: '2026-04-01', duration: 16, startTime: '20:00', endTime: '12:00' }],
      }));

      const content = mockWriteFile.mock.calls[0][1];
      expect(content).toContain('FASTING');
      expect(content).toContain('16');
    });
  });

  describe('exportToPDF', () => {
    it('generates PDF via expo-print', async () => {
      const path = await ExportService.exportToPDF(makeExportRequest());

      expect(mockPrint).toHaveBeenCalledTimes(1);
      const htmlArg = mockPrint.mock.calls[0][0].html;
      expect(htmlArg).toContain('Cals2Gains');
      expect(htmlArg).toContain('Avg Daily Calories');
    });

    it('calculates average calories in summary', async () => {
      await ExportService.exportToPDF(makeExportRequest());

      const htmlArg = mockPrint.mock.calls[0][0].html;
      // Average of 500 + 600 + 300 = 1400 / 3 = 467
      expect(htmlArg).toContain('467');
    });

    it('calculates average macros in summary', async () => {
      await ExportService.exportToPDF(makeExportRequest());

      const htmlArg = mockPrint.mock.calls[0][0].html;
      // Average protein: (40+45+20)/3 = 35
      expect(htmlArg).toContain('35');
    });

    it('includes weight section when requested', async () => {
      await ExportService.exportToPDF(makeExportRequest({
        includeWeight: true,
        weight: [{ date: '2026-04-01', weight: 75 }],
      }));

      const htmlArg = mockPrint.mock.calls[0][0].html;
      expect(htmlArg).toContain('Weight Tracking');
    });
  });

  describe('importBackup', () => {
    it('validates backup structure', async () => {
      const backup = JSON.stringify({
        userId: 'u1',
        version: '1.0',
        backupDate: '2026-04-14',
        meals: [],
      });

      const result = await ExportService.importBackup('u1', backup);
      expect(result).toBe(true);
    });

    it('throws on invalid backup format', async () => {
      await expect(
        ExportService.importBackup('u1', JSON.stringify({ meals: [] })),
      ).rejects.toThrow('Invalid backup format');
    });

    it('throws on invalid JSON', async () => {
      await expect(
        ExportService.importBackup('u1', 'not json'),
      ).rejects.toThrow();
    });
  });

  describe('shareExport', () => {
    it('shares file with correct mime type for PDF', async () => {
      await ExportService.shareExport('/path/to/file.pdf');

      expect(mockShare).toHaveBeenCalledWith('/path/to/file.pdf', {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Cals2Gains Export',
      });
    });

    it('shares file with correct mime type for CSV', async () => {
      await ExportService.shareExport('/path/to/file.csv');

      expect(mockShare).toHaveBeenCalledWith('/path/to/file.csv', {
        mimeType: 'text/csv',
        dialogTitle: 'Share Cals2Gains Export',
      });
    });

    it('throws when sharing unavailable', async () => {
      mockShareAvailable.mockResolvedValueOnce(false);

      await expect(ExportService.shareExport('/path/to/file.csv')).rejects.toThrow(
        'Sharing is not available',
      );
    });
  });

  describe('listRecentExports', () => {
    it('returns files from directory', async () => {
      mockReadDir.mockResolvedValueOnce(['export1.csv', 'export2.pdf']);

      const files = await ExportService.listRecentExports();
      expect(files).toHaveLength(2);
    });

    it('returns empty array on error', async () => {
      mockReadDir.mockRejectedValueOnce(new Error('dir error'));

      const files = await ExportService.listRecentExports();
      expect(files).toEqual([]);
    });
  });

  describe('deleteExport', () => {
    it('deletes file via FileSystem', async () => {
      await ExportService.deleteExport('test.csv');
      expect(mockDeleteFile).toHaveBeenCalledWith(expect.stringContaining('test.csv'));
    });
  });
});
