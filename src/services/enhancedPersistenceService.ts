import { syncManager } from './syncManager';
import { persistenceService } from './persistenceService';
import { hasValidCredentials } from './supabase';

interface DataIntegrityCheck {
  table: string;
  recordId: string;
  checksum: string;
  timestamp: number;
}

class EnhancedPersistenceService {
  private integrityChecks: Map<string, DataIntegrityCheck> = new Map();
  private conflictResolver: ConflictResolver;

  constructor() {
    this.conflictResolver = new ConflictResolver();
    this.setupIntegrityMonitoring();
  }

  private setupIntegrityMonitoring() {
    // Check data integrity every 5 minutes
    setInterval(() => {
      this.performIntegrityCheck();
    }, 5 * 60 * 1000);
  }

  async saveWithIntegrity(table: string, data: any, operation: 'create' | 'update' | 'delete' = 'create') {
    // Generate checksum for data integrity
    const checksum = this.generateChecksum(data);
    
    // Store integrity check
    this.integrityChecks.set(`${table}_${data.id}`, {
      table,
      recordId: data.id,
      checksum,
      timestamp: Date.now()
    });

    // Add metadata for conflict resolution
    const enhancedData = {
      ...data,
      _version: data._version ? data._version + 1 : 1,
      _lastModified: new Date().toISOString(),
      _deviceId: syncManager.getStatus().deviceId,
      _checksum: checksum
    };

    // Use syncManager for actual saving
    await syncManager.saveOperation(table, enhancedData, operation, 'normal');
  }

  private generateChecksum(data: any): string {
    // Simple checksum generation - in production, use a proper hash function
    const str = JSON.stringify(data, Object.keys(data).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private async performIntegrityCheck() {
    if (!hasValidCredentials()) return;

    console.log('🔍 Performing data integrity check...');
    
    for (const [key, check] of this.integrityChecks) {
      try {
        // Load current data from local storage
        const localData = this.getLocalData(check.table, check.recordId);
        if (!localData) continue;

        // Verify checksum
        const currentChecksum = this.generateChecksum(localData);
        if (currentChecksum !== check.checksum) {
          console.warn(`⚠️ Data integrity issue detected for ${key}`);
          await this.resolveIntegrityIssue(check.table, check.recordId, localData);
        }
      } catch (error) {
        console.error(`❌ Integrity check failed for ${key}:`, error);
      }
    }
  }

  private getLocalData(table: string, recordId: string): any {
    try {
      const key = `local_${table}`;
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      return data.find((item: any) => item.id === recordId);
    } catch (error) {
      console.error('Failed to get local data:', error);
      return null;
    }
  }

  private async resolveIntegrityIssue(table: string, recordId: string, localData: any) {
    try {
      // Fetch latest data from cloud
      const cloudData = await this.fetchFromCloud(table, recordId);
      
      if (cloudData) {
        // Use conflict resolver to determine which version to keep
        const resolved = await this.conflictResolver.resolve(localData, cloudData);
        
        // Save resolved data
        await this.saveWithIntegrity(table, resolved, 'update');
        
        console.log(`✅ Integrity issue resolved for ${table}:${recordId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to resolve integrity issue for ${table}:${recordId}:`, error);
    }
  }

  private async fetchFromCloud(table: string, recordId: string): Promise<any> {
    // This would fetch specific record from cloud
    // Implementation depends on your Supabase operations
    return null; // Placeholder
  }
}

class ConflictResolver {
  async resolve(localData: any, cloudData: any): Promise<any> {
    // Simple conflict resolution strategy - can be enhanced
    const localTimestamp = new Date(localData._lastModified || localData.updatedAt || 0).getTime();
    const cloudTimestamp = new Date(cloudData._lastModified || cloudData.updatedAt || 0).getTime();
    
    if (localTimestamp > cloudTimestamp) {
      console.log('🔧 Conflict resolved: Using local version (newer)');
      return localData;
    } else if (cloudTimestamp > localTimestamp) {
      console.log('🔧 Conflict resolved: Using cloud version (newer)');
      return cloudData;
    } else {
      // Same timestamp - merge data intelligently
      console.log('🔧 Conflict resolved: Merging versions');
      return this.mergeData(localData, cloudData);
    }
  }

  private mergeData(localData: any, cloudData: any): any {
    // Intelligent merging - prefer non-null values and longer strings
    const merged = { ...cloudData };
    
    for (const [key, value] of Object.entries(localData)) {
      if (value && (!merged[key] || 
          (typeof value === 'string' && value.length > (merged[key] || '').length))) {
        merged[key] = value;
      }
    }
    
    // Ensure version is incremented
    merged._version = Math.max(
      localData._version || 0, 
      cloudData._version || 0
    ) + 1;
    
    merged._lastModified = new Date().toISOString();
    
    return merged;
  }
}

export const enhancedPersistenceService = new EnhancedPersistenceService();