import { PatientId } from '../value-objects/PatientId';
import { TenantId } from '../value-objects/TenantId';
import { PatientName } from '../value-objects/PatientName';

/**
 * Create Patient Domain DTO
 */
export interface CreatePatientDomainDTO {
  tenantId: TenantId;
  name: PatientName;
  birthDate: Date;
  gender?: 'm' | 'w' | 'd';
  tags?: string[];
  address?: {
    street?: string;
    zip?: string;
    city?: string;
    country?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
    mobile?: string;
  };
  insurance?: {
    number?: string;
    type?: string;
    provider?: string;
  };
}

/**
 * Update Patient Domain DTO
 */
export interface UpdatePatientDomainDTO {
  name?: PatientName;
  birthDate?: Date;
  gender?: 'm' | 'w' | 'd';
  tags?: string[];
  address?: {
    street?: string;
    zip?: string;
    city?: string;
    country?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
    mobile?: string;
  };
  insurance?: {
    number?: string;
    type?: string;
    provider?: string;
  };
}

/**
 * Patient Entity
 * 
 * Business-Entity mit Identität und Lebenszyklus
 */
export class Patient {
  private constructor(
    public readonly id: PatientId,
    public readonly tenantId: TenantId,
    private _name: PatientName,
    private _birthDate: Date,
    public gender: 'm' | 'w' | 'd' | null,
    public tags: readonly string[],
    public version: number,
    public deceased: boolean,
    public deceasedDate: Date | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
    // JSON Fields (werden später zu eigenen Entities)
    public vitalsLatest: any,
    public vitalsHistory: any[],
    public allergies: any[],
    public medications: any[],
    public diagnoses: any[],
    public findings: any[],
    public address: any,
    public contact: any,
    public insurance: any
  ) {}
  
  get name(): PatientName {
    return this._name;
  }
  
  get birthDate(): Date {
    return this._birthDate;
  }
  
  /**
   * Factory-Methode: Erstellt neuen Patient
   * 
   * @throws Error wenn Business-Rules verletzt werden
   */
  static create(dto: CreatePatientDomainDTO): Patient {
    // Business Rule: Geburtsdatum darf nicht in Zukunft liegen
    if (dto.birthDate > new Date()) {
      throw new Error('Birth date cannot be in the future');
    }
    
    return new Patient(
      PatientId.generate(),
      dto.tenantId,
      dto.name,
      dto.birthDate,
      dto.gender || null,
      Object.freeze(dto.tags || []),
      1, // Initial version
      false,
      null,
      new Date(),
      new Date(),
      null, // vitalsLatest
      [], // vitalsHistory
      [], // allergies
      [], // medications
      [], // diagnoses
      [], // findings
      dto.address || null,
      dto.contact || null,
      dto.insurance || null
    );
  }
  
  /**
   * Rekonstituiert Patient aus Persistence
   */
  static reconstitute(data: {
    id: string;
    tenantId: string;
    name: any;
    birthDate: Date;
    gender: string | null;
    tags: string[];
    version: number;
    deceased: boolean;
    deceasedDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    vitalsLatest: any;
    vitalsHistory: any[];
    allergies: any[];
    medications: any[];
    diagnoses: any[];
    findings: any[];
    address: any;
    contact: any;
    insurance: any;
  }): Patient {
    return new Patient(
      PatientId.fromString(data.id),
      TenantId.fromString(data.tenantId),
      PatientName.fromDTO(data.name),
      data.birthDate,
      data.gender as 'm' | 'w' | 'd' | null,
      Object.freeze([...data.tags]),
      data.version,
      data.deceased,
      data.deceasedDate,
      data.createdAt,
      data.updatedAt,
      data.vitalsLatest,
      [...data.vitalsHistory],
      [...data.allergies],
      [...data.medications],
      [...data.diagnoses],
      [...data.findings],
      data.address,
      data.contact,
      data.insurance
    );
  }
  
  /**
   * Business-Methode: Markiert Patient als verstorben
   */
  markDeceased(date?: Date): void {
    this.deceased = true;
    this.deceasedDate = date || new Date();
    this.updatedAt = new Date();
    this.version++;
  }
  
  /**
   * Business-Methode: Aktualisiert Patient
   * 
   * @throws Error wenn Version nicht übereinstimmt (Optimistic Locking)
   * @throws Error wenn Business-Rules verletzt werden
   */
  update(dto: UpdatePatientDomainDTO, expectedVersion: number): void {
    if (this.version !== expectedVersion) {
      throw new Error(`Version mismatch. Expected ${expectedVersion}, got ${this.version}`);
    }
    
    // Business Rules
    if (dto.birthDate && dto.birthDate > new Date()) {
      throw new Error('Birth date cannot be in the future');
    }
    
    // Update
    if (dto.name) this._name = dto.name;
    if (dto.birthDate) this._birthDate = dto.birthDate;
    if (dto.gender !== undefined) this.gender = dto.gender || null;
    if (dto.tags) this.tags = Object.freeze([...dto.tags]);
    if (dto.address !== undefined) this.address = dto.address;
    if (dto.contact !== undefined) this.contact = dto.contact;
    if (dto.insurance !== undefined) this.insurance = dto.insurance;
    
    this.updatedAt = new Date();
    this.version++;
  }
  
  /**
   * Business-Methode: Soft-Delete
   */
  softDelete(_reason: string): void {
    // TODO: Implementiere Soft-Delete-Logik
    this.version++;
  }
}

